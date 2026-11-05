import { expect, test } from "bun:test";
import { TRACKING_ORDER_FIELDS } from "../src/lib/tracking-fields";

test("public tracking never requests confidential customer fields", () => {
  const fields = TRACKING_ORDER_FIELDS.split(",").map((field) => field.trim());
  for (const confidential of ["customer_name", "customer_phone", "address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_reference", "latitude", "longitude", "notes"]) {
    expect(fields).not.toContain(confidential);
  }
  expect(fields).not.toContain("*");
  expect(fields).toContain("status");
});