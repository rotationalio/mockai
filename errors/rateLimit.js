const { globals } = require("../utils/globals");
const { countTokens } = require("./contextLimit");


function rateLimitExceeded(content = "") {
    const tokensPerMinuteLimit = parseInt(process.env.TOKENS_PER_MINUTE) || 0;
    const tokensPerDayLimit = parseInt(process.env.TOKENS_PER_DAY) || 0;
    const requestsPerMinuteLimit = parseInt(process.env.REQUESTS_PER_MINUTE) || 0;
    const requestsPerDayLimit = parseInt(process.env.REQUESTS_PER_DAY) || 0;

    let currentTime = Date.now();
    let localTokens = 0;

    // Increment the requests in minute and day
    globals.REQUESTS_IN_MINUTE++;
    globals.REQUESTS_IN_DAY++;

    // If content is provided, count the tokens
    try {
        if (content) {
            localTokens = countTokens(content);
            // Increment the tokens in minute and day
            globals.TOKENS_IN_MINUTE += localTokens;
            globals.TOKENS_IN_DAY += localTokens;
        }
    }
    // If content is provided but not a string or JSON object, return structured result and let the individual API handle the error
    catch (error) {
        return { exceeded: false, reason: "content is not a string or JSON object" };
    }

    console.log("TIM:", globals.TOKENS_IN_MINUTE, " TID:", globals.TOKENS_IN_DAY, " RIM:", globals.REQUESTS_IN_MINUTE, " RID:", globals.REQUESTS_IN_DAY);

    // Reset the minute counts if the time is greater than 1 minute (60 seconds)
    if (currentTime - globals.GLOBAL_MINUTE_TIME_STAMP > 60000) {
        globals.TOKENS_IN_MINUTE = 0;
        globals.REQUESTS_IN_MINUTE = 0;
        globals.GLOBAL_MINUTE_TIME_STAMP = currentTime;
    }

    // Reset the day counts if the time is greater than 1 day (86400 seconds)
    if (currentTime - globals.GLOBAL_DAY_TIME_STAMP > 86400000) {
        globals.TOKENS_IN_DAY = 0;
        globals.REQUESTS_IN_DAY = 0;
        globals.GLOBAL_DAY_TIME_STAMP = currentTime;
    }

    // Check if the tokens per minute limit is exceeded
    if (tokensPerMinuteLimit >= 0 && globals.TOKENS_IN_MINUTE >= tokensPerMinuteLimit) {
        console.log("Tokens per minute limit exceeded");
        return { exceeded: true, reason: "Tokens per minute limit exceeded" };
    }
    // Check if the tokens per day limit is exceeded
    if (tokensPerDayLimit >= 0 && globals.TOKENS_IN_DAY >= tokensPerDayLimit) {
        console.log("Tokens per day limit exceeded");
        return { exceeded: true, reason: "Tokens per day limit exceeded" };
    }
    // Check if the requests per minute limit is exceeded
    if (requestsPerMinuteLimit >= 0 && globals.REQUESTS_IN_MINUTE >= requestsPerMinuteLimit) {
        console.log("Requests per minute limit exceeded");
        return { exceeded: true, reason: "Requests per minute limit exceeded" };
    }
    // Check if the requests per day limit is exceeded
    if (requestsPerDayLimit >= 0 && globals.REQUESTS_IN_DAY >= requestsPerDayLimit) {
        console.log("Requests per day limit exceeded");
        return { exceeded: true, reason: "Requests per day limit exceeded" };
    }

    return { exceeded: false, reason: "" };
}

module.exports = { rateLimitExceeded };