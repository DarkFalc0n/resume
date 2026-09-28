export default {
  async fetch(request) {
    const GITHUB_ASSET_URL =
      "https://github.com/darkfalc0n/resume/releases/latest/download/pratyayroy20.pdf";

    const response = await fetch(GITHUB_ASSET_URL, {
      redirect: "follow",
    });

    const headers = new Headers(response.headers);
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'inline; filename="pratyayroy20.pdf"');
    headers.delete("Cache-Control");
    headers.set("Cache-Control", "public, max-age=120");

    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });
  },
};