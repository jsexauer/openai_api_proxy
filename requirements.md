# OpenAI API Proxy

This is a simple proxy server for the OpenAI API.  I would like to point an agentic AI coding tool at this proxy server, it would then forward the request to an OpenAI API compatable server.  When the response is received, it would then forward the response back to the agentic AI coding tool.

However, I would like to create a simple UI that shows the request and response in a formatted way.  When new requsts and repsonses come through, they would be appeneded to the end.  There should be a navigation side bar that allows the user to navigate to any of the previous requests and responses.  There should also be an export feature to expor the string of requests and responses to a markdownfile.

Please inlcude any tool command in the UI as well.

Please create this using Angular and ability to run the tool using `npx openai-api-proxy` and host
to port 8077.