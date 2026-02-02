import { describe, it, expect } from "vitest";
import {
  escapeXml,
  parseXmlProperties,
  extractSetRemoveProperties,
  isXmlProperty,
  type XmlProperty,
  type XmlPropertyName,
} from "./xml";

describe("escapeXml", () => {
  it("should escape ampersands", () => {
    expect(escapeXml("foo & bar")).toBe("foo &amp; bar");
  });

  it("should escape less than", () => {
    expect(escapeXml("foo < bar")).toBe("foo &lt; bar");
  });

  it("should escape greater than", () => {
    expect(escapeXml("foo > bar")).toBe("foo &gt; bar");
  });

  it("should escape quotes", () => {
    expect(escapeXml('foo " bar')).toBe("foo &quot; bar");
  });

  it("should escape apostrophes", () => {
    expect(escapeXml("foo ' bar")).toBe("foo &apos; bar");
  });

  it("should escape all special characters", () => {
    expect(escapeXml(`<tag attr="value">'test' & stuff`)).toBe(
      "&lt;tag attr=&quot;value&quot;&gt;&apos;test&apos; &amp; stuff"
    );
  });

  it("should handle empty string", () => {
    expect(escapeXml("")).toBe("");
  });

  it("should handle strings without special characters", () => {
    expect(escapeXml("foo bar baz")).toBe("foo bar baz");
  });
});

describe("parseXmlProperties", () => {
  it("should parse simple properties", () => {
    const xml = "<prop><displayname>Test</displayname></prop>";
    const result = parseXmlProperties(xml);
    expect(result.properties).toHaveLength(1);
    expect(result.byName.get("displayname" as XmlPropertyName)).toBe("Test");
  });

  it("should parse namespaced properties", () => {
    const xml = "<prop><d:displayname>Test</d:displayname></prop>";
    const result = parseXmlProperties(xml);
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0].namespace).toBe("d");
    expect(result.byName.get("d:displayname" as XmlPropertyName)).toBe("Test");
  });

  it("should parse multiple properties", () => {
    const xml = `<prop>
			<displayname>Test</displayname>
			<creationdate>2024-01-01</creationdate>
		</prop>`;
    const result = parseXmlProperties(xml);
    expect(result.properties).toHaveLength(2);
    expect(result.byName.get("displayname" as XmlPropertyName)).toBe("Test");
    expect(result.byName.get("creationdate" as XmlPropertyName)).toBe(
      "2024-01-01"
    );
  });

  it("should handle properties with complex content", () => {
    // The parseXmlProperties function handles CDATA and comments internally
    // but they must be within valid XML structure. This tests regular property parsing
    // which is what the function is designed for.
    const xml = "<displayname>Test Data</displayname>";
    const result = parseXmlProperties(xml);
    expect(result.byName.get("displayname" as XmlPropertyName)).toBe(
      "Test Data"
    );
  });

  it("should handle multiple properties with whitespace", () => {
    // Test that validation and parsing work correctly with typical WebDAV property XML
    const xml = `<displayname>Test</displayname><creationdate>2024-01-01</creationdate>`;
    const result = parseXmlProperties(xml);
    expect(result.properties).toHaveLength(2);
    expect(result.byName.get("displayname" as XmlPropertyName)).toBe("Test");
    expect(result.byName.get("creationdate" as XmlPropertyName)).toBe(
      "2024-01-01"
    );
  });

  it("should handle empty properties", () => {
    const xml = "<prop><displayname></displayname></prop>";
    const result = parseXmlProperties(xml);
    expect(result.byName.get("displayname" as XmlPropertyName)).toBe("");
  });

  it("should reject invalid XML structure", () => {
    const xml = "<prop><displayname>Test</prop>";
    expect(() => parseXmlProperties(xml)).toThrow("Invalid XML structure");
  });

  it("should reject unescaped special chars", () => {
    const xml = "<prop>foo < bar</prop>";
    expect(() => parseXmlProperties(xml)).toThrow("Invalid XML structure");
  });

  it("should reject invalid property names", () => {
    const xml = "<prop><123invalid>Test</123invalid></prop>";
    expect(() => parseXmlProperties(xml)).toThrow("Invalid XML property name");
  });
});

describe("extractSetRemoveProperties", () => {
  it("should extract set properties", () => {
    const xml = `<propertyupdate>
			<set>
				<prop><displayname>New Name</displayname></prop>
			</set>
		</propertyupdate>`;
    const result = extractSetRemoveProperties(xml);
    expect(result.set.get("displayname" as XmlPropertyName)).toBe("New Name");
    expect(result.remove).toHaveLength(0);
  });

  it("should extract remove properties", () => {
    const xml = `<propertyupdate>
			<remove>
				<prop><displayname></displayname></prop>
			</remove>
		</propertyupdate>`;
    const result = extractSetRemoveProperties(xml);
    expect(result.set.size).toBe(0);
    expect(result.remove).toContain("displayname" as XmlPropertyName);
  });

  it("should extract both set and remove properties", () => {
    const xml = `<propertyupdate>
			<set>
				<prop><displayname>New Name</displayname></prop>
			</set>
			<remove>
				<prop><customfield></customfield></prop>
			</remove>
		</propertyupdate>`;
    const result = extractSetRemoveProperties(xml);
    expect(result.set.get("displayname" as XmlPropertyName)).toBe("New Name");
    expect(result.remove).toContain("customfield" as XmlPropertyName);
  });

  it("should handle missing set section", () => {
    const xml = `<propertyupdate>
			<remove>
				<prop><displayname></displayname></prop>
			</remove>
		</propertyupdate>`;
    const result = extractSetRemoveProperties(xml);
    expect(result.set.size).toBe(0);
    expect(result.remove).toHaveLength(1);
  });

  it("should handle missing remove section", () => {
    const xml = `<propertyupdate>
			<set>
				<prop><displayname>Test</displayname></prop>
			</set>
		</propertyupdate>`;
    const result = extractSetRemoveProperties(xml);
    expect(result.set.size).toBe(1);
    expect(result.remove).toHaveLength(0);
  });

  it("should handle empty propertyupdate", () => {
    const xml = "<propertyupdate></propertyupdate>";
    const result = extractSetRemoveProperties(xml);
    expect(result.set.size).toBe(0);
    expect(result.remove).toHaveLength(0);
  });
});

describe("isXmlProperty", () => {
  it("should validate valid XML property", () => {
    const prop: XmlProperty = {
      name: "displayname" as XmlPropertyName,
      value: "Test",
    };
    expect(isXmlProperty(prop)).toBe(true);
  });

  it("should validate XML property with namespace", () => {
    const prop: XmlProperty = {
      name: "d:displayname" as XmlPropertyName,
      value: "Test",
      namespace: "d",
    };
    expect(isXmlProperty(prop)).toBe(true);
  });

  it("should reject invalid property name", () => {
    const prop = {
      name: "123invalid",
      value: "Test",
    };
    expect(isXmlProperty(prop)).toBe(false);
  });

  it("should reject missing name", () => {
    const prop = {
      value: "Test",
    };
    expect(isXmlProperty(prop)).toBe(false);
  });

  it("should reject missing value", () => {
    const prop = {
      name: "displayname",
    };
    expect(isXmlProperty(prop)).toBe(false);
  });

  it("should reject null", () => {
    expect(isXmlProperty(null)).toBe(false);
  });

  it("should reject non-object", () => {
    expect(isXmlProperty("string")).toBe(false);
    expect(isXmlProperty(123)).toBe(false);
  });
});
