import assert from "node:assert/strict";
import test from "node:test";
import { getRaroNexusConfig } from "./auth";

test("usa a identidade Raroclients no cliente e nos cookies padrão", () => {
  const previousClientId = process.env.RARONEXUS_CLIENT_ID;

  try {
    delete process.env.RARONEXUS_CLIENT_ID;
    const config = getRaroNexusConfig();

    assert.equal(config.clientId, "raroclients");
    assert.equal(config.cookies.session, "raroclients_global_session");
    assert.equal(config.cookies.localSession, "raroclients_app_session");
    assert.equal(config.cookies.state, "raroclients_sso_state");
    assert.equal(config.cookies.silentState, "raroclients_sso_silent_state");
  } finally {
    if (previousClientId === undefined) delete process.env.RARONEXUS_CLIENT_ID;
    else process.env.RARONEXUS_CLIENT_ID = previousClientId;
  }
});
