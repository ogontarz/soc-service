const forever = require("forever-monitor");
const port = 3000;
const restarts = 3;

let child = new (forever.Monitor)("index.js", {
    max: restarts,
    silent: false,
    args: [port]
});

child.on("start", () => {
    console.log("Starting service...");
})

process.on('SIGINT', function() {
    console.log("Exiting service...")
    child.stop();
    process.exit();
});

child.on("exit", function () {
    console.log("Service has exited after " + restarts + " restarts");
});

child.start();