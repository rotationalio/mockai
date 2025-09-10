const { tokenize } = require("../utils/tokenize");


function contextLimitExceeded(content) {

    // Get the context limit from the environment variable
    const contextLimit = (parseInt(process.env.CONTEXT_LIMIT) || 40000);

    // Disable context limit errors
    if (contextLimit === 0) {
        return false;
    }

    // Try to convert the content to a JSON object
    // If successful, we know it's a message and can parse it accordingly
    try {
        content = JSON.stringify(content);
    }
    catch (error) {
        content = content;
    }

    // Check if the content is a string (text completion)
    if (typeof content === "string") {
        const totalTokens = tokenize(content).length;
        return totalTokens > contextLimit;
    }

    // Check if the content is a JSON object (chat messages)
    else if (typeof content === "object") {
        let totalTokens = 0;
        for (const message of content) {
            if ("content" in message) {
                // Try to tokenize the content (ensure message contains content, otherwise return false and let the individual API handle the error)
                try {
                    totalTokens += tokenize(message.content).length;
                }
                catch (error) {
                    return false;
                }
            }
        }
        return totalTokens > contextLimit;
    }

    // If the content is not a string or a JSON object, return false and let the individual API handle the error
    return false;
}

module.exports = { contextLimitExceeded };
