import { assert, describe, it } from "@effect/vitest"
import { isPureDomainModule, isServiceDomainFile } from "./layout.ts"

describe("layout", () => {
  it("a domain's service, repositories and migrations are its service files", () => {
    assert.isTrue(isServiceDomainFile("domains/catalog/Catalog.ts"))
    assert.isTrue(isServiceDomainFile("domains/catalog/CatalogRepo.ts"))
    assert.isTrue(isServiceDomainFile("domains/catalog/migrations.ts"))
    assert.isFalse(isServiceDomainFile("domains/catalog/Rom.ts"))
    assert.isFalse(isServiceDomainFile("features/import/handlers.ts"))
  })

  it("every other file directly in a domain is a pure concept module", () => {
    assert.isTrue(isPureDomainModule("domains/catalog/Rom.ts"))
    assert.isFalse(isPureDomainModule("domains/catalog/Catalog.ts"))
    assert.isFalse(isPureDomainModule("domains/catalog/Rom.test.ts"))
    assert.isFalse(isPureDomainModule("app/server.ts"))
  })
})
