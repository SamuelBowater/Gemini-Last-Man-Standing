import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const size = Number(req.nextUrl.searchParams.get("size")) || 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d9488",
          fontSize: size * 0.55,
        }}
      >
        ⚽
      </div>
    ),
    { width: size, height: size }
  );
}
