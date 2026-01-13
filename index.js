import http from "http";

const PORT = Number(process.env.PORT);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("API is running");
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
