const { tokenize } = require("../utils/tokenize");

function countTokens(content) {
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
        return tokenize(content).length;
    }
    // Check if the content is a JSON object (chat messages)
    else if (typeof content === "object") {
        let totalTokens = 0;
        for (const message of content) {
            if ("content" in message) {
                // Try to tokenize the content (ensure message content is a string) otherwise return -1 and let the individual API handle the error
                try {
                    totalTokens += tokenize(message.content).length;
                }
                catch (error) {
                    return -1;
                }
            }
            else {
                // If the message does not contain content, return -1 and let the individual API handle the error
                return -1;
            }
        }
        return totalTokens;
    }
    // If the content is not a string or a JSON object, return -1
    else {
        return -1;
    }
}

function contextLimitExceeded(content) {

    // Get the context limit from the environment variable
    const contextLimit = (parseInt(process.env.CONTEXT_LIMIT) || 0);

    // Disable context limit errors
    if (contextLimit === 0) {
        return false;
    }

    if (countTokens(content) >= contextLimit) {
        return true;
    }
    else {
        return false;
    }
}

module.exports = { countTokens, contextLimitExceeded };
