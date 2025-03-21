import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { StepsList } from "../components/StepsList";
import { FileExplorer } from "../components/FileExplorer";
import { TabView } from "../components/TabView";
import { CodeEditor } from "../components/CodeEditor";
import { PreviewFrame } from "../components/PreviewFrame";
import { Step, FileItem, StepType } from "../types";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { parseXml } from "../steps";
import { useWebContainer } from "../hooks/useWebContainer";
import { Loader } from "../components/Loader";
import { FileSystemTree } from "@webcontainer/api";

// Removed unused MOCK_FILE_CONTENT

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const { webcontainer } = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  const createMountStructure = (fileItems: FileItem[]): FileSystemTree => {
    const mountStructure: FileSystemTree = {
      src: { directory: {} },
      public: { directory: {} }
    };

    const processFile = (file: FileItem) => {
      const normalizedPath = file.path?.replace(/^\/+/, '') || '';
      const parts = normalizedPath.split('/');
      
      if (file.type === 'file') {
        const dirPath = parts.slice(0, -1).join('/');
        const fileName = parts[parts.length - 1];
        
        let current = mountStructure;
        if (dirPath) {
          const dirs = dirPath.split('/');
          for (const dir of dirs) {
            if (!current[dir]) {
              current[dir] = { directory: {} };
            }
            current = (current[dir] as { directory: FileSystemTree }).directory;
          }
        }
        
        current[fileName] = {
          file: { contents: file.content || '' }
        };
      }
    };

    fileItems.forEach(processFile);
    return mountStructure;
  };

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps
      .filter(({ status }) => status === "pending")
      .forEach((step) => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.replace(/^\/+/, '').split("/") ?? [];
          let currentFileStructure = [...originalFiles];
          const finalAnswerRef = currentFileStructure;

          let currentFolder = "";
          while (parsedPath.length) {
            currentFolder = currentFolder ? `${currentFolder}/${parsedPath[0]}` : parsedPath[0];
            const currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);

            if (!parsedPath.length) {
              const file = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "file",
                  path: currentFolder,
                  content: step.code,
                });
              } else {
                file.content = step.code;
              }
            } else {
              const folder = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!folder) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "folder",
                  path: currentFolder,
                  children: [],
                });
              }

              currentFileStructure = currentFileStructure.find(
                (x) => x.path === currentFolder
              )!.children!;
            }
          }
          originalFiles = finalAnswerRef;
        }
      });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((steps) =>
        steps.map((s: Step) => ({
          ...s,
          status: "completed" as const,
        }))
      );
    }
  }, [steps]);

  useEffect(() => {
    const mountFiles = async () => {
      if (webcontainer && files.length > 0) {
        try {
          console.log('Mounting files:', files);
          const structure = createMountStructure(files);
          console.log('Mount structure:', structure);
          await webcontainer.mount(structure);
          console.log('Files mounted successfully');
        } catch (err) {
          console.error('Error mounting files:', err);
        }
      }
    };

    mountFiles();
  }, [files, webcontainer]);

  async function init() {
    try {
      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });
      setTemplateSet(true);

      const { prompts, uiPrompts } = response.data;
      setLoading(true);

      // First, get the template steps with proper typing
      const templateSteps = parseXml(uiPrompts[0]).map((x: Step, index) => ({
        ...x,
        id: index + 1,
        status: "pending" as const,
      }));

      // Then, get the chat response
      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...prompts, prompt].map((content) => ({
          role: "user",
          content,
        })),
      });

      // Parse the chat response steps with proper typing
      const chatSteps = parseXml(stepsResponse.data.response).map((x, index) => ({
        ...x,
        id: templateSteps.length + index + 1,
        status: "pending" as const,
      }));

      // Set all steps at once
      setSteps([...templateSteps, ...chatSteps]);

      // Update messages
      setLlmMessages([
        ...[...prompts, prompt].map((content) => ({
          role: "user" as const,
          content,
        })),
        {
          role: "assistant" as const,
          content: stepsResponse.data.response,
        },
      ]);
    } catch (error) {
      console.error('Error in init:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (prompt) {
      init();
    }
  }, [prompt]);

  const handleSendMessage = async () => {
    if (!userPrompt.trim()) return;

    const newMessage = {
      role: "user" as const,
      content: userPrompt,
    };

    try {
      setLoading(true);
      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...llmMessages, newMessage],
      });

      // Update messages first
      setLlmMessages((prev) => [
        ...prev,
        newMessage,
        {
          role: "assistant" as const,
          content: stepsResponse.data.response,
        },
      ]);

      // Then update steps with unique numeric IDs
      setSteps((currentSteps) => {
        const maxId = currentSteps.reduce((max, step) => Math.max(max, step.id), 0);
        const newSteps = parseXml(stepsResponse.data.response).map((x, index) => ({
          ...x,
          id: maxId + index + 1,
          status: "pending" as const,
        }));

        return [...currentSteps, ...newSteps];
      });

      setPrompt(""); // Clear the input
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div className="max-h-[75vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div>
                <div className="flex">
                  <br />
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && (
                    <div className="flex">
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="p-2 w-full"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={loading}
                        className="bg-purple-400 px-4 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>
          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === "code" ? (
                <CodeEditor file={selectedFile} />
              ) : webcontainer ? (
                <PreviewFrame webContainer={webcontainer} files={createMountStructure(files)} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Loading web container...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}