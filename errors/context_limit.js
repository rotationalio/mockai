const { tokenize } = require("../utils/tokenize");


function contextLimitExceeded(content) {

    // Get the context limit from the environment variable
    const contextLimit = (parseInt(process.env.CONTEXT_LIMIT) || 4096);

    // Disable context limit errors
    if (contextLimit === 0) {
        return false;
    }

    // Try to convert the content to a JSON object
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
            totalTokens += tokenize(message.content).length;
        }
        return totalTokens > contextLimit;
    }

    // If the content is not a string or a JSON object, return false
    return false;
}

module.exports = { contextLimitExceeded };