export const escapeXml = (str: string): string =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");

// Branded types for type safety
export type XmlString = string & { readonly __brand: "XmlString" };
export type XmlPropertyName = string & { readonly __brand: "XmlPropertyName" };

export interface XmlProperty {
	readonly name: XmlPropertyName;
	readonly value: string;
	readonly namespace?: string;
}

export interface ParsedXmlProperties {
	readonly properties: ReadonlyArray<XmlProperty>;
	readonly byName: ReadonlyMap<XmlPropertyName, string>;
}
// Validation functions
const isValidXmlName = (name: string): name is XmlPropertyName => {
	// XML name rules: starts with letter/underscore, contains letters/digits/.-_:
	return /^[a-zA-Z_:][\w.-:]*$/.test(name);
};

const validateXmlStructure = (xml: string): xml is XmlString => {
	// Basic well-formedness checks
	const openTags = xml.match(/<[^/][^>]*>/g)?.length ?? 0;
	const closeTags = xml.match(/<\/[^>]+>/g)?.length ?? 0;

	if (openTags !== closeTags) return false;

	// Check for unescaped special chars outside tags
	const outsideTags = xml.replace(/<[^>]+>/g, "");
	if (/[<>]/.test(outsideTags)) return false;

	return true;
};

export const parseXmlProperties = (xml: string): ParsedXmlProperties => {
	if (!validateXmlStructure(xml)) {
		throw new Error("Invalid XML structure");
	}

	const properties: XmlProperty[] = [];
	const byName = new Map<XmlPropertyName, string>();

	// Remove CDATA sections
	const cleanXml = xml.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");

	// Remove comments
	const noComments = cleanXml.replace(/<!--.*?-->/gs, "");

	// Match property elements (handles namespaces)
	const propRegex = /<(?:(\w+):)?(\w+)(?:\s[^>]*)?>([^<]*)<\/(?:\1:)?\2>/g;
	let match: RegExpExecArray | null;

	while ((match = propRegex.exec(noComments)) !== null) {
		const namespace = match[1];
		const propName = match[2];
		const propValue = match[3].trim();

		if (!isValidXmlName(propName)) {
			throw new Error(`Invalid XML property name: ${propName}`);
		}

		const fullName = (
			namespace ?
				`${namespace}:${propName}`
			:	propName) as XmlPropertyName;

		properties.push({
			name: fullName,
			value: propValue,
			namespace,
		});

		byName.set(fullName, propValue);
	}

	return { properties, byName };
};

export const extractSetRemoveProperties = (
	xml: string
): {
	readonly set: ReadonlyMap<XmlPropertyName, string>;
	readonly remove: ReadonlyArray<XmlPropertyName>;
} => {
	const setMatch = xml.match(/<set>(.*?)<\/set>/s);
	const removeMatch = xml.match(/<remove>(.*?)<\/remove>/s);

	const setParsed =
		setMatch ?
			parseXmlProperties(setMatch[1])
		:	{ byName: new Map(), properties: [] };
	const removeParsed =
		removeMatch ?
			parseXmlProperties(removeMatch[1])
		:	{ byName: new Map(), properties: [] };

	return {
		set: setParsed.byName,
		remove: removeParsed.properties.map((p) => p.name),
	};
};

// Type guard for runtime validation
export const isXmlProperty = (obj: unknown): obj is XmlProperty => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"name" in obj &&
		"value" in obj &&
		typeof obj.name === "string" &&
		typeof obj.value === "string" &&
		isValidXmlName(obj.name) &&
		(!("namespace" in obj) || typeof obj.namespace === "string")
	);
};
