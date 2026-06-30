export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. マルチプレイ用 WebRTC シグナリングのエンドポイント
    // (相手のSteamworks P2PパケットをWebRTCにブリッジする中継点)
    if (url.pathname === "/api/signaling") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket Upgrade", { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      server.addEventListener("message", async (event) => {
        // AI SREによるパケット監視と適応型再送制御のロジック（将来的な拡張用）
        // 受信したSDPやICE Candidateを対向のPCクライアント（エミュレータ経由）に転送
        server.send(JSON.stringify({ type: "ack", timestamp: Date.now() }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // 2. ゲームアセットのオンデマンド配信用エンドポイント
    // (ゲーム本体を改造せず、必要なデータだけをR2からストリーミング)
    if (url.pathname.startsWith("/assets/")) {
      const assetKey = url.pathname.replace("/assets/", "");
      const object = await env.GAME_ASSETS.get(assetKey);

      if (object === null) {
        return new Response("Asset Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("Access-Control-Allow-Origin", "*"); // PWAコンテナからのアクセスを許可

      return new Response(object.body, { headers });
    }

    // デフォルトはPagesのアセットをそのまま返す
    return env.ASSETS.fetch(request);
  },
};
