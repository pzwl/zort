# Zort

**Zort** is a modern web application inspired by [bolt.new](https://bolt.new/) that showcases how to integrate multiple AI services and advanced JavaScript/TypeScript features. It focuses on creating an interactive and dynamic user experience.

## Overview

Zort leverages TypeScript and JavaScript to provide a Node.js backend that interacts with various AI APIs (GPT, Claude), handles streaming responses, and demonstrates prompt engineering techniques.

### Key Features

- **AI Chat Integration**: Connect with GPT and Claude APIs directly from Node.js.
- **Prompt Engineering**: Craft dynamic prompts and templates to optimize AI responses.
- **Streaming Responses**: Real-time streaming of AI-generated content.
- **WebContainers**: Experiment with running code directly in the browser environment.
- **File Explorer**: A built-in file management system in the frontend.
- **TypeScript & JavaScript**: Benefit from static typing while maintaining flexibility.

## Technologies Used

- **Node.js** for the server-side environment.
- **TypeScript** to add type safety and better developer tooling.
- **JavaScript** in the frontend and certain backend scripts.
- **GPT** & **Claude** for AI functionalities.
- **WebContainers** for running code in the browser.
- **Express** (or a similar framework) for the backend API.
- **React** (or another frontend framework) for the user interface (optional, based on your actual setup).

## Project Structure

- **backend**: Contains the server-side code.
- **frontend**: Contains the client-side code.

## Installation

1. **Clone the Repository**

    ```bash
    git clone https://github.com/pzwl/zort.git
    cd zort
    ```

2. **Install Dependencies for Each Directory**

    **Backend:**

    ```bash
    cd backend
    npm install
    # or yarn install if you use Yarn
    ```

    **Frontend:**

    ```bash
    cd ../frontend
    npm install
    # or yarn install if you use Yarn
    ```

3. **Configure Environment Variables**

    Create a `.env` file in the `backend` folder for environment variables (e.g., API keys for GPT, Claude, etc.).

## Usage

### Start the Backend

```bash
cd backend
npm run dev
The backend will run at http://localhost:5000 (or another configured port).

Start the Frontend
bash
cd ../frontend
npm start





#AI Integrations
Update your .env file with your GPT and Claude API keys.

The backend includes endpoints for sending prompts, streaming responses, and managing follow-up prompts.

File Explorer & WebContainers (if applicable)
The frontend provides a file explorer to manage or view files.

WebContainers allow you to run certain code in the browser for demo purposes.

