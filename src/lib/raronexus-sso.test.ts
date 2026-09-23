import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest, NextResponse } from "next/server";
import { GET as start } from "../app/api/auth/raronexus/start/route";
import { GET as callback } from "../app/api/auth/raronexus/callback/route";

test("SSO silencioso sem sessao termina sem invalidar o login interativo", async () => {
  const previousBaseUrl = process.env.RARONEXUS_BASE_URL;
  const previousClientId = process.env.RARONEXUS_CLIENT_ID;
  process.env.RARONEXUS_BASE_URL = "http://localhost:3001";
  process.env.RARONEXUS_CLIENT_ID = "raroclients";

  try {
    const silentStart = await start(new NextRequest("http://localhost:3002/api/auth/raronexus/start?mode=silent"));
    const interactiveStart = await start(new NextRequest("http://localhost:3002/api/auth/raronexus/start"));
    assert.ok(silentStart instanceof NextResponse);
    assert.ok(interactiveStart instanceof NextResponse);
    const silentState = new URL(silentStart.headers.get("location")!).searchParams.get("state");
    const interactiveState = new URL(interactiveStart.headers.get("location")!).searchParams.get("state");
    const cookies = [...silentStart.cookies.getAll(), ...interactiveStart.cookies.getAll()]
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    assert.equal(new URL(silentStart.headers.get("location")!).searchParams.get("prompt"), "none");
    assert.equal(new URL(interactiveStart.headers.get("location")!).searchParams.has("prompt"), false);
    assert.notEqual(silentState, interactiveState);

    const silentCallback = await callback(new NextRequest(
      `http://localhost:3002/api/auth/raronexus/callback?error=login_required&state=${silentState}`,
      { headers: { cookie: cookies } },
    ));
    assert.equal(silentCallback.status, 200);
    assert.match(await silentCallback.text(), /"status":"error","mode":"silent"/);
    const clearedCookies = silentCallback.cookies.getAll().map(({ name }) => name);
    assert.deepEqual(clearedCookies.sort(), ["raroclients_sso_silent_next", "raroclients_sso_silent_state"].sort());

    const interactiveCallback = await callback(new NextRequest(
      `http://localhost:3002/api/auth/raronexus/callback?error=access_denied&state=${interactiveState}`,
      { headers: { cookie: cookies } },
    ));
    assert.equal(interactiveCallback.status, 400);
    assert.match(await interactiveCallback.text(), /"status":"error","mode":"interactive"/);
    assert.deepEqual(
      interactiveCallback.cookies.getAll().map(({ name }) => name).sort(),
      ["raroclients_sso_next", "raroclients_sso_state"].sort(),
    );
  } finally {
    if (previousBaseUrl === undefined) delete process.env.RARONEXUS_BASE_URL;
    else process.env.RARONEXUS_BASE_URL = previousBaseUrl;
    if (previousClientId === undefined) delete process.env.RARONEXUS_CLIENT_ID;
    else process.env.RARONEXUS_CLIENT_ID = previousClientId;
  }
});
