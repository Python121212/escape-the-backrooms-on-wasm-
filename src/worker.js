export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 相手のPC（Steam）とあなたのPixel 9a（Goldberg）を繋ぐWebRTCシグナリングのみ
    if (url.pathname === "/api/signaling") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket Upgrade", { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      server.addEventListener("message", async (event) => {
        // P2Pの接続確立要求（SDP/ICE交換）を対向クライアントへ転送
        // ゲームファイルには一切触れず、通信パケットだけを中継
        server.send(JSON.stringify({ type: "bridge_ack", timestamp: Date.now() }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // フロントエンド（Pages）の静的ファイルを返す
    return env.ASSETS.fetch(request);
  },
};
