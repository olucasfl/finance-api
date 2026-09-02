import { plainToInstance } from "class-transformer"
import { validateSync } from "class-validator"

import { SetVoxProfileDto } from "./set-vox-profile.dto"

function errorsFor(payload: unknown) {
  return validateSync(plainToInstance(SetVoxProfileDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  })
}

describe("SetVoxProfileDto", () => {
  it("accepts a known profile key", () => {
    expect(errorsFor({ profile: "STUDY" })).toHaveLength(0)
    expect(errorsFor({ profile: "DEFAULT" })).toHaveLength(0)
  })

  it("rejects an unknown profile key", () => {
    expect(errorsFor({ profile: "NOPE" }).length).toBeGreaterThan(0)
  })

  it("rejects a missing or non-string profile", () => {
    expect(errorsFor({}).length).toBeGreaterThan(0)
    expect(errorsFor({ profile: 3 }).length).toBeGreaterThan(0)
  })

  it("rejects an unexpected extra field", () => {
    expect(errorsFor({ profile: "STUDY", hacked: true }).length).toBeGreaterThan(0)
  })
})
