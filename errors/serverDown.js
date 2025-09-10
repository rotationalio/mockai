function serverDown() {
    // Get the context limit from the environment variable
    const down_rate = (parseFloat(process.env.DOWN_RATE) || 0);
    generated_rate = Math.random();
    if (down_rate > 0 && generated_rate < down_rate) {
        return true;
    }
    return false;
}

module.exports = { serverDown };