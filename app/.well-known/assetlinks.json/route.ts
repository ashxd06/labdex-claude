const packageName = "com.labdex.app";
const relation = "delegate_permission/common.handle_all_urls";
// Public certificate fingerprint of the externally distributed Android release.
// This value is intentionally public: Android requires it in Digital Asset Links.
const fingerprints = [
  "FB:BF:A7:99:4B:74:85:3B:10:FE:BD:D2:47:D1:5F:50:75:92:36:37:56:E3:CD:69:1A:EB:BC:A1:7E:14:BA:85",
];

export function GET() {
  return Response.json(
    [
      {
        relation: [relation],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
