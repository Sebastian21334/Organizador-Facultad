import { Qn as Subject, Zn as BehaviorSubject, rr as Observable, ur as Subscription } from "./esm5-ChK3bs0s.js";
//#region node_modules/@angular/core/fesm2022/_effect-chunk.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var activeConsumer = null;
var inNotificationPhase = false;
var epoch = 1;
var postProducerCreatedFn = null;
var SIGNAL = /* @__PURE__ */ Symbol("SIGNAL");
function setActiveConsumer(consumer) {
	const prev = activeConsumer;
	activeConsumer = consumer;
	return prev;
}
function getActiveConsumer() {
	return activeConsumer;
}
function isInNotificationPhase() {
	return inNotificationPhase;
}
var REACTIVE_NODE = {
	version: 0,
	lastCleanEpoch: 0,
	dirty: false,
	producers: void 0,
	producersTail: void 0,
	consumers: void 0,
	consumersTail: void 0,
	recomputing: false,
	consumerAllowSignalWrites: false,
	consumerIsAlwaysLive: false,
	kind: "unknown",
	producerMustRecompute: () => false,
	producerRecomputeValue: () => {},
	consumerMarkedDirty: () => {},
	consumerOnSignalRead: () => {}
};
function producerAccessed(node) {
	if (inNotificationPhase) throw new Error(typeof ngDevMode !== "undefined" && ngDevMode ? `Assertion error: signal read during notification phase` : "");
	if (activeConsumer === null) return;
	activeConsumer.consumerOnSignalRead(node);
	const prevProducerLink = activeConsumer.producersTail;
	if (prevProducerLink !== void 0 && prevProducerLink.producer === node) return;
	let nextProducerLink = void 0;
	const isRecomputing = activeConsumer.recomputing;
	if (isRecomputing) {
		nextProducerLink = prevProducerLink !== void 0 ? prevProducerLink.nextProducer : activeConsumer.producers;
		if (nextProducerLink !== void 0 && nextProducerLink.producer === node) {
			activeConsumer.producersTail = nextProducerLink;
			nextProducerLink.lastReadVersion = node.version;
			nextProducerLink.knownValidAtEpoch = epoch;
			return;
		}
	}
	const prevConsumerLink = node.consumersTail;
	if (prevConsumerLink !== void 0 && prevConsumerLink.consumer === activeConsumer && (!isRecomputing || prevConsumerLink.knownValidAtEpoch === epoch)) return;
	const isLive = consumerIsLive(activeConsumer);
	const newLink = {
		producer: node,
		consumer: activeConsumer,
		nextProducer: nextProducerLink,
		prevConsumer: void 0,
		knownValidAtEpoch: epoch,
		lastReadVersion: node.version,
		nextConsumer: void 0
	};
	activeConsumer.producersTail = newLink;
	if (prevProducerLink !== void 0) prevProducerLink.nextProducer = newLink;
	else activeConsumer.producers = newLink;
	if (isLive) producerAddLiveConsumer(node, newLink);
}
function producerIncrementEpoch() {
	epoch++;
}
function producerUpdateValueVersion(node) {
	if (consumerIsLive(node) && !node.dirty) return;
	if (!node.dirty && node.lastCleanEpoch === epoch) return;
	if (!node.producerMustRecompute(node) && !consumerPollProducersForChange(node)) {
		producerMarkClean(node);
		return;
	}
	node.producerRecomputeValue(node);
	producerMarkClean(node);
}
function producerNotifyConsumers(node) {
	if (node.consumers === void 0) return;
	const prev = inNotificationPhase;
	inNotificationPhase = true;
	try {
		for (let link = node.consumers; link !== void 0; link = link.nextConsumer) {
			const consumer = link.consumer;
			if (!consumer.dirty) consumerMarkDirty(consumer);
		}
	} finally {
		inNotificationPhase = prev;
	}
}
function producerUpdatesAllowed() {
	return activeConsumer?.consumerAllowSignalWrites !== false;
}
function consumerMarkDirty(node) {
	node.dirty = true;
	producerNotifyConsumers(node);
	node.consumerMarkedDirty?.(node);
}
function producerMarkClean(node) {
	node.dirty = false;
	node.lastCleanEpoch = epoch;
}
function consumerBeforeComputation(node) {
	if (node) resetConsumerBeforeComputation(node);
	return setActiveConsumer(node);
}
function resetConsumerBeforeComputation(node) {
	if (node.producersTail?.knownValidAtEpoch === epoch) {
		let producer = node.producers;
		while (producer !== void 0) {
			producer.knownValidAtEpoch = null;
			producer = producer.nextProducer;
		}
	}
	node.producersTail = void 0;
	node.recomputing = true;
}
function consumerAfterComputation(node, prevConsumer) {
	setActiveConsumer(prevConsumer);
	if (node) finalizeConsumerAfterComputation(node);
}
function finalizeConsumerAfterComputation(node) {
	node.recomputing = false;
	const producersTail = node.producersTail;
	let toRemove = producersTail !== void 0 ? producersTail.nextProducer : node.producers;
	if (toRemove !== void 0) {
		if (consumerIsLive(node)) do
			toRemove = producerRemoveLiveConsumerLink(toRemove);
		while (toRemove !== void 0);
		if (producersTail !== void 0) producersTail.nextProducer = void 0;
		else node.producers = void 0;
	}
}
function consumerPollProducersForChange(node) {
	for (let link = node.producers; link !== void 0; link = link.nextProducer) {
		const producer = link.producer;
		const seenVersion = link.lastReadVersion;
		if (seenVersion !== producer.version) return true;
		producerUpdateValueVersion(producer);
		if (seenVersion !== producer.version) return true;
	}
	return false;
}
function consumerDestroy(node) {
	if (consumerIsLive(node)) {
		let link = node.producers;
		while (link !== void 0) link = producerRemoveLiveConsumerLink(link);
	}
	node.producers = void 0;
	node.producersTail = void 0;
	node.consumers = void 0;
	node.consumersTail = void 0;
}
function producerAddLiveConsumer(node, link) {
	const consumersTail = node.consumersTail;
	const wasLive = consumerIsLive(node);
	if (consumersTail !== void 0) {
		link.nextConsumer = consumersTail.nextConsumer;
		consumersTail.nextConsumer = link;
	} else {
		link.nextConsumer = void 0;
		node.consumers = link;
	}
	link.prevConsumer = consumersTail;
	node.consumersTail = link;
	if (!wasLive) for (let link = node.producers; link !== void 0; link = link.nextProducer) producerAddLiveConsumer(link.producer, link);
}
function producerRemoveLiveConsumerLink(link) {
	const producer = link.producer;
	const nextProducer = link.nextProducer;
	const nextConsumer = link.nextConsumer;
	const prevConsumer = link.prevConsumer;
	link.nextConsumer = void 0;
	link.prevConsumer = void 0;
	if (nextConsumer !== void 0) nextConsumer.prevConsumer = prevConsumer;
	else producer.consumersTail = prevConsumer;
	if (prevConsumer !== void 0) prevConsumer.nextConsumer = nextConsumer;
	else {
		producer.consumers = nextConsumer;
		if (!consumerIsLive(producer)) {
			let producerLink = producer.producers;
			while (producerLink !== void 0) producerLink = producerRemoveLiveConsumerLink(producerLink);
		}
	}
	return nextProducer;
}
function consumerIsLive(node) {
	return node.consumerIsAlwaysLive || node.consumers !== void 0;
}
function runPostProducerCreatedFn(node) {
	postProducerCreatedFn?.(node);
}
function defaultEquals(a, b) {
	return Object.is(a, b);
}
function createComputed(computation, equal) {
	const node = Object.create(COMPUTED_NODE);
	node.computation = computation;
	if (equal !== void 0) node.equal = equal;
	const computed = () => {
		producerUpdateValueVersion(node);
		producerAccessed(node);
		if (node.value === ERRORED) throw node.error;
		return node.value;
	};
	computed[SIGNAL] = node;
	if (typeof ngDevMode !== "undefined" && ngDevMode) computed.toString = () => `[Computed${node.debugName ? " (" + node.debugName + ")" : ""}: ${String(node.value)}]`;
	runPostProducerCreatedFn(node);
	return computed;
}
var UNSET = /* @__PURE__ */ Symbol("UNSET");
var COMPUTING = /* @__PURE__ */ Symbol("COMPUTING");
var ERRORED = /* @__PURE__ */ Symbol("ERRORED");
var COMPUTED_NODE = /* @__PURE__ */ (() => {
	return {
		...REACTIVE_NODE,
		value: UNSET,
		dirty: true,
		error: null,
		equal: defaultEquals,
		kind: "computed",
		producerMustRecompute(node) {
			return node.value === UNSET || node.value === COMPUTING;
		},
		producerRecomputeValue(node) {
			if (node.value === COMPUTING) throw new Error(typeof ngDevMode !== "undefined" && ngDevMode ? "Detected cycle in computations." : "");
			const oldValue = node.value;
			node.value = COMPUTING;
			const prevConsumer = consumerBeforeComputation(node);
			let newValue;
			let wasEqual = false;
			try {
				newValue = node.computation();
				setActiveConsumer(null);
				wasEqual = oldValue !== UNSET && oldValue !== ERRORED && newValue !== ERRORED && node.equal(oldValue, newValue);
			} catch (err) {
				newValue = ERRORED;
				node.error = err;
			} finally {
				consumerAfterComputation(node, prevConsumer);
			}
			if (wasEqual) {
				node.value = oldValue;
				return;
			}
			node.value = newValue;
			node.version++;
		}
	};
})();
function defaultThrowError() {
	throw new Error();
}
var throwInvalidWriteToSignalErrorFn = defaultThrowError;
function throwInvalidWriteToSignalError(node) {
	throwInvalidWriteToSignalErrorFn(node);
}
function setThrowInvalidWriteToSignalError(fn) {
	throwInvalidWriteToSignalErrorFn = fn;
}
var postSignalSetFn = null;
function createSignal(initialValue, equal) {
	const node = Object.create(SIGNAL_NODE);
	node.value = initialValue;
	if (equal !== void 0) node.equal = equal;
	const getter = () => signalGetFn(node);
	getter[SIGNAL] = node;
	if (typeof ngDevMode !== "undefined" && ngDevMode) getter.toString = () => `[Signal${node.debugName ? " (" + node.debugName + ")" : ""}: ${String(node.value)}]`;
	runPostProducerCreatedFn(node);
	const set = (newValue) => signalSetFn(node, newValue);
	const update = (updateFn) => signalUpdateFn(node, updateFn);
	return [
		getter,
		set,
		update
	];
}
function signalGetFn(node) {
	producerAccessed(node);
	return node.value;
}
function signalSetFn(node, newValue) {
	if (!producerUpdatesAllowed()) throwInvalidWriteToSignalError(node);
	if (!node.equal(node.value, newValue)) {
		node.value = newValue;
		signalValueChanged(node);
	}
}
function signalUpdateFn(node, updater) {
	if (!producerUpdatesAllowed()) throwInvalidWriteToSignalError(node);
	signalSetFn(node, updater(node.value));
}
var SIGNAL_NODE = /* @__PURE__ */ (() => {
	return {
		...REACTIVE_NODE,
		equal: defaultEquals,
		value: void 0,
		kind: "signal"
	};
})();
function signalValueChanged(node) {
	node.version++;
	producerIncrementEpoch();
	producerNotifyConsumers(node);
	postSignalSetFn?.(node);
}
var BASE_EFFECT_NODE = /* @__PURE__ */ (() => ({
	...REACTIVE_NODE,
	consumerIsAlwaysLive: true,
	consumerAllowSignalWrites: true,
	dirty: true,
	kind: "effect"
}))();
function runEffect(node) {
	node.dirty = false;
	if (node.version > 0 && !consumerPollProducersForChange(node)) return;
	node.version++;
	const prevNode = consumerBeforeComputation(node);
	try {
		node.cleanup();
		node.fn();
	} finally {
		consumerAfterComputation(node, prevNode);
	}
}
//#endregion
//#region node_modules/@angular/core/fesm2022/_not_found-chunk.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var _currentInjector = void 0;
function getCurrentInjector() {
	return _currentInjector;
}
function setCurrentInjector(injector) {
	const former = _currentInjector;
	_currentInjector = injector;
	return former;
}
var NOT_FOUND = Symbol("NotFound");
function isNotFound(e) {
	return e === NOT_FOUND || e?.name === "ɵNotFound";
}
//#endregion
//#region node_modules/@angular/core/fesm2022/_untracked-chunk.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
function createLinkedSignal(sourceFn, computationFn, equalityFn) {
	const node = Object.create(LINKED_SIGNAL_NODE);
	node.source = sourceFn;
	node.computation = computationFn;
	if (equalityFn != void 0) node.equal = equalityFn;
	const linkedSignalGetter = () => {
		producerUpdateValueVersion(node);
		producerAccessed(node);
		if (node.value === ERRORED) throw node.error;
		return node.value;
	};
	const getter = linkedSignalGetter;
	getter[SIGNAL] = node;
	if (typeof ngDevMode !== "undefined" && ngDevMode) getter.toString = () => `[LinkedSignal${node.debugName ? " (" + node.debugName + ")" : ""}: ${String(node.value)}]`;
	runPostProducerCreatedFn(node);
	return getter;
}
function linkedSignalSetFn(node, newValue) {
	producerUpdateValueVersion(node);
	signalSetFn(node, newValue);
	producerMarkClean(node);
}
function linkedSignalUpdateFn(node, updater) {
	producerUpdateValueVersion(node);
	if (node.value === ERRORED) throw node.error;
	signalUpdateFn(node, updater);
	producerMarkClean(node);
}
var LINKED_SIGNAL_NODE = /* @__PURE__ */ (() => {
	return {
		...REACTIVE_NODE,
		value: UNSET,
		dirty: true,
		error: null,
		equal: defaultEquals,
		kind: "linkedSignal",
		producerMustRecompute(node) {
			return node.value === UNSET || node.value === COMPUTING;
		},
		producerRecomputeValue(node) {
			if (node.value === COMPUTING) throw new Error(typeof ngDevMode !== "undefined" && ngDevMode ? "Detected cycle in computations." : "");
			const oldValue = node.value;
			node.value = COMPUTING;
			const prevConsumer = consumerBeforeComputation(node);
			let newValue;
			let wasEqual = false;
			try {
				const newSourceValue = node.source();
				const oldValueValid = oldValue !== UNSET && oldValue !== ERRORED;
				const prev = oldValueValid ? {
					source: node.sourceValue,
					value: oldValue
				} : void 0;
				newValue = node.computation(newSourceValue, prev);
				node.sourceValue = newSourceValue;
				setActiveConsumer(null);
				wasEqual = oldValueValid && newValue !== ERRORED && node.equal(oldValue, newValue);
			} catch (err) {
				newValue = ERRORED;
				node.error = err;
			} finally {
				consumerAfterComputation(node, prevConsumer);
			}
			if (wasEqual) {
				node.value = oldValue;
				return;
			}
			node.value = newValue;
			node.version++;
		}
	};
})();
function untracked$1(nonReactiveReadsFn) {
	const prevConsumer = setActiveConsumer(null);
	try {
		return nonReactiveReadsFn();
	} finally {
		setActiveConsumer(prevConsumer);
	}
}
//#endregion
//#region node_modules/@angular/core/fesm2022/primitives-signals.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var formatter = {
	header: (sig, config) => {
		if (!isSignal$1(sig) || config?.ngSkipFormatting) return null;
		let value;
		try {
			value = sig();
		} catch (e) {
			return ["span", `Signal(⚠️ Error)${e.message ? `: ${e.message}` : ""}`];
		}
		const kind = "computation" in sig[SIGNAL] ? "Computed" : "Signal";
		const isPrimitive = value === null || !Array.isArray(value) && typeof value !== "object";
		return [
			"span",
			{},
			[
				"span",
				{},
				`${kind}(`
			],
			(() => {
				if (isSignal$1(value)) return formatter.header(value, config);
				else if (isPrimitive && value !== void 0 && typeof value !== "function") return ["object", { object: value }];
				else return prettifyPreview(value);
			})(),
			[
				"span",
				{},
				`)`
			]
		];
	},
	hasBody: (sig, config) => {
		if (!isSignal$1(sig)) return false;
		try {
			sig();
		} catch {
			return false;
		}
		return !config?.ngSkipFormatting;
	},
	body: (sig, config) => {
		const color = "var(--sys-color-primary)";
		return [
			"div",
			{ style: `background: #FFFFFF10; padding-left: 4px; padding-top: 2px; padding-bottom: 2px;` },
			[
				"div",
				{ style: `color: ${color}` },
				"Signal value: "
			],
			[
				"div",
				{ style: `padding-left: .5rem;` },
				["object", {
					object: sig(),
					config
				}]
			],
			[
				"div",
				{ style: `color: ${color}` },
				"Signal function: "
			],
			[
				"div",
				{ style: `padding-left: .5rem;` },
				["object", {
					object: sig,
					config: {
						...config,
						ngSkipFormatting: true
					}
				}]
			]
		];
	}
};
function prettifyPreview(value) {
	if (value === null) return "null";
	if (Array.isArray(value)) return `Array(${value.length})`;
	if (value instanceof Element) return `<${value.tagName.toLowerCase()}>`;
	if (value instanceof URL) return `URL`;
	switch (typeof value) {
		case "undefined": return "undefined";
		case "function": if ("prototype" in value) return "class";
		else return "() => {…}";
		case "object": if (value.constructor.name === "Object") return "{…}";
		else return `${value.constructor.name} {}`;
		default: return ["object", {
			object: value,
			config: { ngSkipFormatting: true }
		}];
	}
}
function isSignal$1(value) {
	return value[SIGNAL] !== void 0;
}
function installDevToolsSignalFormatter() {
	globalThis.devtoolsFormatters ??= [];
	if (!globalThis.devtoolsFormatters.some((f) => f === formatter)) globalThis.devtoolsFormatters.push(formatter);
}
if (typeof ngDevMode === "undefined" || ngDevMode) installDevToolsSignalFormatter();
//#endregion
//#region node_modules/@angular/core/fesm2022/_pending_tasks-chunk.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var Version = class {
	full;
	major;
	minor;
	patch;
	constructor(full) {
		this.full = full;
		const parts = full.split(".");
		this.major = parts[0];
		this.minor = parts[1];
		this.patch = parts.slice(2).join(".");
	}
};
var VERSION = /* @__PURE__ */ new Version("22.1.2");
var DOC_PAGE_BASE_URL = (() => {
	const full = VERSION.full;
	return `https://${full.includes("-next") || full.includes("-rc") || full === "0.0.0-PLACEHOLDER" ? "next" : `v${VERSION.major}`}.angular.dev`;
})();
var ERROR_DETAILS_PAGE_BASE_URL = (() => {
	return `${DOC_PAGE_BASE_URL}/errors`;
})();
var XSS_SECURITY_URL = "https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss";
var RuntimeError = class extends Error {
	code;
	constructor(code, message) {
		super(formatRuntimeError(code, message));
		this.code = code;
	}
};
function formatRuntimeErrorCode(code) {
	return `NG0${Math.abs(code)}`;
}
function formatRuntimeError(code, message) {
	const fullCode = formatRuntimeErrorCode(code);
	let errorMessage = `${fullCode}${message ? ": " + message : ""}`;
	if (ngDevMode && code < 0) {
		const separator = !errorMessage.match(/[.,;!?\n]$/) ? "." : "";
		errorMessage = `${errorMessage}${separator} Find more at ${ERROR_DETAILS_PAGE_BASE_URL}/${fullCode}`;
	}
	return errorMessage;
}
function getClosureSafeProperty(objWithPropertyToExtract) {
	for (let key in objWithPropertyToExtract) if (objWithPropertyToExtract[key] === getClosureSafeProperty) return key;
	throw Error(typeof ngDevMode !== "undefined" && ngDevMode ? "Could not find renamed property on target object." : "");
}
function fillProperties(target, source) {
	for (const key in source) if (source.hasOwnProperty(key) && !target.hasOwnProperty(key)) target[key] = source[key];
}
function stringify(token) {
	if (typeof token === "string") return token;
	if (Array.isArray(token)) return `[${token.map(stringify).join(", ")}]`;
	if (token == null) return "" + token;
	const name = token.overriddenName || token.name;
	if (name) return `${name}`;
	const result = token.toString();
	if (result == null) return "" + result;
	const newLineIndex = result.indexOf("\n");
	return newLineIndex >= 0 ? result.slice(0, newLineIndex) : result;
}
function concatStringsWithSpace(before, after) {
	if (!before) return after || "";
	if (!after) return before;
	return `${before} ${after}`;
}
function truncateMiddle(str, maxLength = 100) {
	if (!str || maxLength < 1 || str.length <= maxLength) return str;
	if (maxLength == 1) return str.substring(0, 1) + "...";
	const halfLimit = Math.round(maxLength / 2);
	return str.substring(0, halfLimit) + "..." + str.substring(str.length - halfLimit);
}
var __forward_ref__ = getClosureSafeProperty({ __forward_ref__: getClosureSafeProperty });
function forwardRef(forwardRefFn) {
	forwardRefFn.__forward_ref__ = forwardRef;
	if (ngDevMode) forwardRefFn.toString = function() {
		return stringify(this());
	};
	return forwardRefFn;
}
function resolveForwardRef(type) {
	return isForwardRef(type) ? type() : type;
}
function isForwardRef(fn) {
	return typeof fn === "function" && fn.hasOwnProperty(__forward_ref__) && fn.__forward_ref__ === forwardRef;
}
function assertNumber(actual, msg) {
	if (!(typeof actual === "number")) throwError(msg, typeof actual, "number", "===");
}
function assertNumberInRange(actual, minInclusive, maxInclusive) {
	assertNumber(actual, "Expected a number");
	assertLessThanOrEqual(actual, maxInclusive, "Expected number to be less than or equal to");
	assertGreaterThanOrEqual(actual, minInclusive, "Expected number to be greater than or equal to");
}
function assertString(actual, msg) {
	if (!(typeof actual === "string")) throwError(msg, actual === null ? "null" : typeof actual, "string", "===");
}
function assertFunction(actual, msg) {
	if (!(typeof actual === "function")) throwError(msg, actual === null ? "null" : typeof actual, "function", "===");
}
function assertEqual(actual, expected, msg) {
	if (!(actual == expected)) throwError(msg, actual, expected, "==");
}
function assertNotEqual(actual, expected, msg) {
	if (!(actual != expected)) throwError(msg, actual, expected, "!=");
}
function assertSame(actual, expected, msg) {
	if (!(actual === expected)) throwError(msg, actual, expected, "===");
}
function assertNotSame(actual, expected, msg) {
	if (!(actual !== expected)) throwError(msg, actual, expected, "!==");
}
function assertLessThan(actual, expected, msg) {
	if (!(actual < expected)) throwError(msg, actual, expected, "<");
}
function assertLessThanOrEqual(actual, expected, msg) {
	if (!(actual <= expected)) throwError(msg, actual, expected, "<=");
}
function assertGreaterThan(actual, expected, msg) {
	if (!(actual > expected)) throwError(msg, actual, expected, ">");
}
function assertGreaterThanOrEqual(actual, expected, msg) {
	if (!(actual >= expected)) throwError(msg, actual, expected, ">=");
}
function assertNotDefined(actual, msg) {
	if (actual != null) throwError(msg, actual, null, "==");
}
function assertDefined(actual, msg) {
	if (actual == null) throwError(msg, actual, null, "!=");
}
function throwError(msg, actual, expected, comparison) {
	throw new Error(`ASSERTION ERROR: ${msg}` + (comparison == null ? "" : ` [Expected=> ${expected} ${comparison} ${actual} <=Actual]`));
}
function assertDomNode(node) {
	if (!(node instanceof Node)) throwError(`The provided value must be an instance of a DOM Node but got ${stringify(node)}`);
}
function assertElement(node) {
	if (!(node instanceof Element)) throwError(`The provided value must be an element but got ${stringify(node)}`);
}
function assertIndexInRange(arr, index) {
	assertDefined(arr, "Array must be defined.");
	const maxLen = arr.length;
	if (index < 0 || index >= maxLen) throwError(`Index expected to be less than ${maxLen} but got ${index}`);
}
function assertOneOf(value, ...validValues) {
	if (validValues.indexOf(value) !== -1) return true;
	throwError(`Expected value to be one of ${JSON.stringify(validValues)} but was ${JSON.stringify(value)}.`);
}
function assertNotReactive(fn) {
	if (getActiveConsumer() !== null) throwError(`${fn}() should never be called in a reactive context.`);
}
function ɵɵdefineInjectable(opts) {
	return {
		token: opts.token,
		providedIn: opts.providedIn || null,
		factory: opts.factory,
		value: void 0
	};
}
function ɵɵdefineInjector(options) {
	return {
		providers: options.providers || [],
		imports: options.imports || []
	};
}
function getInjectableDef(type) {
	return getOwnDefinition(type, NG_PROV_DEF);
}
function isInjectable(type) {
	return getInjectableDef(type) !== null;
}
function getOwnDefinition(type, field) {
	return type.hasOwnProperty(field) && type[field] || null;
}
function getInheritedInjectableDef(type) {
	const def = type?.[NG_PROV_DEF] ?? null;
	if (def) {
		ngDevMode && console.warn(`DEPRECATED: DI is instantiating a token "${type.name}" that inherits its @Injectable decorator but does not provide one itself.\nThis will become an error in a future version of Angular. Please add @Injectable() to the "${type.name}" class.`);
		return def;
	} else return null;
}
function getInjectorDef(type) {
	return type && type.hasOwnProperty(NG_INJ_DEF) ? type[NG_INJ_DEF] : null;
}
var NG_PROV_DEF = getClosureSafeProperty({ ɵprov: getClosureSafeProperty });
var NG_INJ_DEF = getClosureSafeProperty({ ɵinj: getClosureSafeProperty });
var InjectionToken = class {
	_desc;
	ngMetadataName = "InjectionToken";
	ɵprov;
	constructor(_desc, options) {
		this._desc = _desc;
		this.ɵprov = void 0;
		if (typeof options == "number") {
			(typeof ngDevMode === "undefined" || ngDevMode) && assertLessThan(options, 0, "Only negative numbers are supported here");
			this.__NG_ELEMENT_ID__ = options;
		} else if (options !== void 0) this.ɵprov = ɵɵdefineInjectable({
			token: this,
			providedIn: options.providedIn || "root",
			factory: options.factory
		});
	}
	get multi() {
		return this;
	}
	toString() {
		return `InjectionToken ${this._desc}`;
	}
};
var _injectorProfilerContext;
function getInjectorProfilerContext() {
	!ngDevMode && throwError("getInjectorProfilerContext should never be called in production mode");
	return _injectorProfilerContext;
}
function setInjectorProfilerContext(context) {
	!ngDevMode && throwError("setInjectorProfilerContext should never be called in production mode");
	const previous = _injectorProfilerContext;
	_injectorProfilerContext = context;
	return previous;
}
var injectorProfilerCallbacks = [];
var NOOP_PROFILER_REMOVAL = () => {};
function removeProfiler(profiler) {
	const profilerIdx = injectorProfilerCallbacks.indexOf(profiler);
	if (profilerIdx !== -1) injectorProfilerCallbacks.splice(profilerIdx, 1);
}
function setInjectorProfiler(injectorProfiler) {
	!ngDevMode && throwError("setInjectorProfiler should never be called in production mode");
	if (injectorProfiler !== null) {
		if (!injectorProfilerCallbacks.includes(injectorProfiler)) injectorProfilerCallbacks.push(injectorProfiler);
		return () => removeProfiler(injectorProfiler);
	} else {
		injectorProfilerCallbacks.length = 0;
		return NOOP_PROFILER_REMOVAL;
	}
}
function injectorProfiler(event) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	for (let i = 0; i < injectorProfilerCallbacks.length; i++) {
		const injectorProfilerCallback = injectorProfilerCallbacks[i];
		injectorProfilerCallback(event);
	}
}
function emitProviderConfiguredEvent(eventProvider, isViewProvider = false) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	let token;
	if (typeof eventProvider === "function") token = eventProvider;
	else if (eventProvider instanceof InjectionToken) token = eventProvider;
	else token = resolveForwardRef(eventProvider.provide);
	let provider = eventProvider;
	if (eventProvider instanceof InjectionToken) provider = eventProvider.ɵprov || eventProvider;
	injectorProfiler({
		type: 2,
		context: getInjectorProfilerContext(),
		providerRecord: {
			token,
			provider,
			isViewProvider
		}
	});
}
function emitInjectorToCreateInstanceEvent(token) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	injectorProfiler({
		type: 5,
		context: getInjectorProfilerContext(),
		token
	});
}
function emitInstanceCreatedByInjectorEvent(instance) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	injectorProfiler({
		type: 1,
		context: getInjectorProfilerContext(),
		instance: { value: instance }
	});
}
function emitInjectEvent(token, value, flags) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	injectorProfiler({
		type: 0,
		context: getInjectorProfilerContext(),
		service: {
			token,
			value,
			flags
		}
	});
}
function emitEffectCreatedEvent(effect) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	injectorProfiler({
		type: 3,
		context: getInjectorProfilerContext(),
		effect
	});
}
function emitAfterRenderEffectPhaseCreatedEvent(effectPhase) {
	!ngDevMode && throwError("Injector profiler should never be called in production mode");
	injectorProfiler({
		type: 4,
		context: getInjectorProfilerContext(),
		effectPhase
	});
}
function runInInjectorProfilerContext(injector, token, callback) {
	!ngDevMode && throwError("runInInjectorProfilerContext should never be called in production mode");
	const prevInjectContext = setInjectorProfilerContext({
		injector,
		token
	});
	try {
		callback();
	} finally {
		setInjectorProfilerContext(prevInjectContext);
	}
}
function isEnvironmentProviders(value) {
	return value && !!value.ɵproviders;
}
var NG_COMP_DEF = getClosureSafeProperty({ ɵcmp: getClosureSafeProperty });
var NG_DIR_DEF = getClosureSafeProperty({ ɵdir: getClosureSafeProperty });
var NG_PIPE_DEF = getClosureSafeProperty({ ɵpipe: getClosureSafeProperty });
var NG_MOD_DEF = getClosureSafeProperty({ ɵmod: getClosureSafeProperty });
var NG_FACTORY_DEF = getClosureSafeProperty({ ɵfac: getClosureSafeProperty });
var NG_ELEMENT_ID = getClosureSafeProperty({ __NG_ELEMENT_ID__: getClosureSafeProperty });
var NG_ENV_ID = getClosureSafeProperty({ __NG_ENV_ID__: getClosureSafeProperty });
function getNgModuleDef(type) {
	assertTypeDefined(type, "@NgModule");
	return type[NG_MOD_DEF] || null;
}
function getNgModuleDefOrThrow(type) {
	const ngModuleDef = getNgModuleDef(type);
	if (!ngModuleDef) throw new RuntimeError(915, (typeof ngDevMode === "undefined" || ngDevMode) && `Type ${stringify(type)} does not have 'ɵmod' property.`);
	return ngModuleDef;
}
function getComponentDef(type) {
	assertTypeDefined(type, "@Component");
	return type[NG_COMP_DEF] || null;
}
function getDirectiveDefOrThrow(type) {
	const def = getDirectiveDef(type);
	if (!def) throw new RuntimeError(916, (typeof ngDevMode === "undefined" || ngDevMode) && `Type ${stringify(type)} does not have 'ɵdir' property.`);
	return def;
}
function getDirectiveDef(type) {
	assertTypeDefined(type, "@Directive");
	return type[NG_DIR_DEF] || null;
}
function getPipeDef(type) {
	assertTypeDefined(type, "@Pipe");
	return type[NG_PIPE_DEF] || null;
}
function assertTypeDefined(type, symbolType) {
	if (type == null) throw new RuntimeError(-919, (typeof ngDevMode === "undefined" || ngDevMode) && `Cannot read ${symbolType} metadata. This can indicate a runtime circular dependency in your app that needs to be resolved.`);
}
function isStandalone(type) {
	const def = getComponentDef(type) || getDirectiveDef(type) || getPipeDef(type);
	return def !== null && def.standalone;
}
function renderStringify(value) {
	if (typeof value === "string") return value;
	if (value == null) return "";
	return String(value);
}
function stringifyForError(value) {
	if (typeof value === "function") return value.name || value.toString();
	if (typeof value === "object" && value != null && typeof value.type === "function") return value.type.name || value.type.toString();
	return renderStringify(value);
}
function debugStringifyTypeForError(type) {
	const componentDef = getComponentDef(type);
	if (componentDef !== null && componentDef.debugInfo) return stringifyTypeFromDebugInfo(componentDef.debugInfo);
	return stringifyForError(type);
}
function stringifyTypeFromDebugInfo(debugInfo) {
	if (!debugInfo.filePath || !debugInfo.lineNumber) return debugInfo.className;
	else return `${debugInfo.className} (at ${debugInfo.filePath}:${debugInfo.lineNumber})`;
}
var NG_RUNTIME_ERROR_CODE = getClosureSafeProperty({ "ngErrorCode": getClosureSafeProperty });
var NG_RUNTIME_ERROR_MESSAGE = getClosureSafeProperty({ "ngErrorMessage": getClosureSafeProperty });
var NG_TOKEN_PATH = getClosureSafeProperty({ "ngTokenPath": getClosureSafeProperty });
function cyclicDependencyError(token, path) {
	return createRuntimeError(ngDevMode ? `Circular dependency detected for \`${token}\`.` : "", -200, path);
}
function cyclicDependencyErrorWithDetails(token, path) {
	return augmentRuntimeError(cyclicDependencyError(token, path), null);
}
function throwMixedMultiProviderError() {
	throw new Error(`Cannot mix multi providers and regular providers`);
}
function throwInvalidProviderError(ngModuleType, providers, provider) {
	if (ngModuleType && providers) {
		const providerDetail = providers.map((v) => v == provider ? "?" + provider + "?" : "...");
		throw new Error(`Invalid provider for the NgModule '${stringify(ngModuleType)}' - only instances of Provider and Type are allowed, got: [${providerDetail.join(", ")}]`);
	} else if (isEnvironmentProviders(provider)) if (provider.ɵfromNgModule) throw new RuntimeError(-207, `Invalid providers from 'importProvidersFrom' present in a non-environment injector. 'importProvidersFrom' can't be used for component providers.`);
	else throw new RuntimeError(-207, `Invalid providers present in a non-environment injector. 'EnvironmentProviders' can't be used for component providers.`);
	else throw new Error("Invalid provider");
}
function throwProviderNotFoundError(token, injectorName) {
	throw new RuntimeError(-201, ngDevMode && `No provider for ${stringifyForError(token)} found${injectorName ? ` in ${injectorName}` : ""}`);
}
function prependTokenToDependencyPath(error, token) {
	error[NG_TOKEN_PATH] ??= [];
	const currentPath = error[NG_TOKEN_PATH];
	let pathStr;
	if (typeof token === "object" && "multi" in token && token?.multi === true) {
		assertDefined(token.provide, "Token with multi: true should have a provide property");
		pathStr = stringifyForError(token.provide);
	} else pathStr = stringifyForError(token);
	if (currentPath[0] !== pathStr) error[NG_TOKEN_PATH].unshift(pathStr);
}
function augmentRuntimeError(error, source) {
	const tokenPath = error[NG_TOKEN_PATH];
	const errorCode = error[NG_RUNTIME_ERROR_CODE];
	error.message = formatErrorMessage(error[NG_RUNTIME_ERROR_MESSAGE] || error.message, errorCode, tokenPath, source);
	return error;
}
function createRuntimeError(message, code, path) {
	const error = new RuntimeError(code, message);
	error[NG_RUNTIME_ERROR_CODE] = code;
	error[NG_RUNTIME_ERROR_MESSAGE] = message;
	if (path) error[NG_TOKEN_PATH] = path;
	return error;
}
function getRuntimeErrorCode(error) {
	return error[NG_RUNTIME_ERROR_CODE];
}
function formatErrorMessage(text, code, path = [], source = null) {
	let pathDetails = "";
	if (path && path.length > 1) pathDetails = ` Path: ${path.join(" -> ")}.`;
	return formatRuntimeError(code, `${text}${source ? ` Source: ${source}.` : ""}${pathDetails}`);
}
var _injectImplementation;
function getInjectImplementation() {
	return _injectImplementation;
}
function setInjectImplementation(impl) {
	const previous = _injectImplementation;
	_injectImplementation = impl;
	return previous;
}
function injectRootLimpMode(token, notFoundValue, flags) {
	const injectableDef = getInjectableDef(token);
	if (injectableDef && injectableDef.providedIn == "root") return injectableDef.value === void 0 ? injectableDef.value = injectableDef.factory() : injectableDef.value;
	if (flags & 8) return null;
	if (notFoundValue !== void 0) return notFoundValue;
	throwProviderNotFoundError(token, typeof ngDevMode !== "undefined" && ngDevMode ? "Injector" : "");
}
function assertInjectImplementationNotEqual(fn) {
	ngDevMode && assertNotEqual(_injectImplementation, fn, "Calling ɵɵinject would cause infinite recursion");
}
var _global = globalThis;
function ngDevModeResetPerfCounters() {
	const locationString = typeof location !== "undefined" ? location.toString() : "";
	const newCounters = {
		hydratedNodes: 0,
		hydratedComponents: 0,
		dehydratedViewsRemoved: 0,
		dehydratedViewsCleanupRuns: 0,
		componentsSkippedHydration: 0,
		deferBlocksWithIncrementalHydration: 0
	};
	if (!(locationString.indexOf("ngDevMode=false") === -1)) _global["ngDevMode"] = false;
	else {
		if (typeof _global["ngDevMode"] !== "object") _global["ngDevMode"] = {};
		Object.assign(_global["ngDevMode"], newCounters);
	}
	return newCounters;
}
function initNgDevMode() {
	if (typeof ngDevMode === "undefined" || ngDevMode) {
		if (typeof ngDevMode !== "object" || Object.keys(ngDevMode).length === 0) ngDevModeResetPerfCounters();
		return typeof ngDevMode !== "undefined" && !!ngDevMode;
	}
	return false;
}
var THROW_IF_NOT_FOUND = {};
var DI_DECORATOR_FLAG = "__NG_DI_FLAG__";
var RetrievingInjector = class {
	injector;
	constructor(injector) {
		this.injector = injector;
	}
	retrieve(token, options) {
		const flags = convertToBitFlags(options) || 0;
		try {
			return this.injector.get(token, flags & 8 ? null : THROW_IF_NOT_FOUND, flags);
		} catch (e) {
			if (isNotFound(e)) return e;
			throw e;
		}
	}
};
function injectInjectorOnly(token, flags = 0) {
	const currentInjector = getCurrentInjector();
	if (currentInjector === void 0) throw new RuntimeError(-203, ngDevMode && `The \`${stringify(token)}\` token injection failed. \`inject()\` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with \`runInInjectionContext\`.`);
	else if (currentInjector === null) return injectRootLimpMode(token, void 0, flags);
	else {
		const options = convertToInjectOptions(flags);
		const value = currentInjector.retrieve(token, options);
		ngDevMode && emitInjectEvent(token, value, flags);
		if (isNotFound(value)) {
			if (options.optional) return null;
			throw value;
		}
		return value;
	}
}
function ɵɵinject(token, flags = 0) {
	return (getInjectImplementation() || injectInjectorOnly)(resolveForwardRef(token), flags);
}
function ɵɵinvalidFactoryDep(index) {
	throw new RuntimeError(202, ngDevMode && `This constructor is not compatible with Angular Dependency Injection because its dependency at index ${index} of the parameter list is invalid.
This can happen if the dependency type is a primitive like a string or if an ancestor of this class is missing an Angular decorator.

Please check that 1) the type for the parameter at index ${index} is correct and 2) the correct Angular decorators are defined for this class and its ancestors.`);
}
function inject(token, options) {
	return ɵɵinject(token, convertToBitFlags(options));
}
function convertToBitFlags(flags) {
	if (typeof flags === "undefined" || typeof flags === "number") return flags;
	return 0 | (flags.optional && 8) | (flags.host && 1) | (flags.self && 2) | (flags.skipSelf && 4);
}
function convertToInjectOptions(flags) {
	return {
		optional: !!(flags & 8),
		host: !!(flags & 1),
		self: !!(flags & 2),
		skipSelf: !!(flags & 4)
	};
}
function injectArgs(types) {
	const args = [];
	for (let i = 0; i < types.length; i++) {
		const arg = resolveForwardRef(types[i]);
		if (Array.isArray(arg)) {
			if (arg.length === 0) throw new RuntimeError(900, ngDevMode && "Arguments array must have arguments.");
			let type = void 0;
			let flags = 0;
			for (let j = 0; j < arg.length; j++) {
				const meta = arg[j];
				const flag = getInjectFlag(meta);
				if (typeof flag === "number") if (flag === -1) type = meta.token;
				else flags |= flag;
				else type = meta;
			}
			args.push(ɵɵinject(type, flags));
		} else args.push(ɵɵinject(arg));
	}
	return args;
}
function attachInjectFlag(decorator, flag) {
	decorator[DI_DECORATOR_FLAG] = flag;
	decorator.prototype[DI_DECORATOR_FLAG] = flag;
	return decorator;
}
function getInjectFlag(token) {
	return token[DI_DECORATOR_FLAG];
}
function getFactoryDef(type, throwNotFound) {
	const hasFactoryDef = type.hasOwnProperty(NG_FACTORY_DEF);
	if (!hasFactoryDef && throwNotFound === true && ngDevMode) throw new Error(`Type ${stringify(type)} does not have 'ɵfac' property.`);
	return hasFactoryDef ? type[NG_FACTORY_DEF] : null;
}
function arrayEquals(a, b, identityAccessor) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		let valueA = a[i];
		let valueB = b[i];
		if (identityAccessor) {
			valueA = identityAccessor(valueA);
			valueB = identityAccessor(valueB);
		}
		if (valueB !== valueA) return false;
	}
	return true;
}
function flatten(list) {
	return list.flat(Number.POSITIVE_INFINITY);
}
function deepForEach(input, fn) {
	input.forEach((value) => Array.isArray(value) ? deepForEach(value, fn) : fn(value));
}
function addToArray(arr, index, value) {
	if (index >= arr.length) arr.push(value);
	else arr.splice(index, 0, value);
}
function removeFromArray(arr, index) {
	if (index >= arr.length - 1) return arr.pop();
	else return arr.splice(index, 1)[0];
}
function newArray(size, value) {
	const list = [];
	for (let i = 0; i < size; i++) list.push(value);
	return list;
}
function arraySplice(array, index, count) {
	const length = array.length - count;
	while (index < length) {
		array[index] = array[index + count];
		index++;
	}
	while (count--) array.pop();
}
function arrayInsert2(array, index, value1, value2) {
	ngDevMode && assertLessThanOrEqual(index, array.length, "Can't insert past array end.");
	let end = array.length;
	if (end == index) array.push(value1, value2);
	else if (end === 1) {
		array.push(value2, array[0]);
		array[0] = value1;
	} else {
		end--;
		array.push(array[end - 1], array[end]);
		while (end > index) {
			array[end] = array[end - 2];
			end--;
		}
		array[index] = value1;
		array[index + 1] = value2;
	}
}
function keyValueArraySet(keyValueArray, key, value) {
	let index = keyValueArrayIndexOf(keyValueArray, key);
	if (index >= 0) keyValueArray[index | 1] = value;
	else {
		index = ~index;
		arrayInsert2(keyValueArray, index, key, value);
	}
	return index;
}
function keyValueArrayGet(keyValueArray, key) {
	const index = keyValueArrayIndexOf(keyValueArray, key);
	if (index >= 0) return keyValueArray[index | 1];
}
function keyValueArrayIndexOf(keyValueArray, key) {
	return _arrayIndexOfSorted(keyValueArray, key, 1);
}
function _arrayIndexOfSorted(array, value, shift) {
	ngDevMode && assertEqual(Array.isArray(array), true, "Expecting an array");
	let start = 0;
	let end = array.length >> shift;
	while (end !== start) {
		const middle = start + (end - start >> 1);
		const current = array[middle << shift];
		if (value === current) return middle << shift;
		else if (current > value) end = middle;
		else start = middle + 1;
	}
	return ~(end << shift);
}
var EMPTY_OBJ = {};
var EMPTY_ARRAY = [];
if ((typeof ngDevMode === "undefined" || ngDevMode) && initNgDevMode()) {
	Object.freeze(EMPTY_OBJ);
	Object.freeze(EMPTY_ARRAY);
}
var ENVIRONMENT_INITIALIZER = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "ENVIRONMENT_INITIALIZER" : "");
var INJECTOR$1 = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "INJECTOR" : "", -1);
var INJECTOR_DEF_TYPES = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "INJECTOR_DEF_TYPES" : "");
var NullInjector = class {
	get(token, notFoundValue = THROW_IF_NOT_FOUND) {
		if (notFoundValue === THROW_IF_NOT_FOUND) {
			const error = createRuntimeError(ngDevMode ? `No provider found for \`${stringify(token)}\`.` : "", -201);
			error.name = "ɵNotFound";
			throw error;
		}
		return notFoundValue;
	}
};
function makeEnvironmentProviders(providers) {
	return { ɵproviders: providers };
}
function provideEnvironmentInitializer(initializerFn) {
	return makeEnvironmentProviders([{
		provide: ENVIRONMENT_INITIALIZER,
		multi: true,
		useValue: initializerFn
	}]);
}
function importProvidersFrom(...sources) {
	return {
		ɵproviders: internalImportProvidersFrom(true, sources),
		ɵfromNgModule: true
	};
}
function internalImportProvidersFrom(checkForStandaloneCmp, ...sources) {
	const providersOut = [];
	const dedup = /* @__PURE__ */ new Set();
	let injectorTypesWithProviders;
	const collectProviders = (provider) => {
		providersOut.push(provider);
	};
	deepForEach(sources, (source) => {
		if ((typeof ngDevMode === "undefined" || ngDevMode) && checkForStandaloneCmp) {
			if (getComponentDef(source)?.standalone) throw new RuntimeError(800, `Importing providers supports NgModule or ModuleWithProviders but got a standalone component "${stringifyForError(source)}"`);
		}
		const internalSource = source;
		if (walkProviderTree(internalSource, collectProviders, [], dedup)) {
			injectorTypesWithProviders ||= [];
			injectorTypesWithProviders.push(internalSource);
		}
	});
	if (injectorTypesWithProviders !== void 0) processInjectorTypesWithProviders(injectorTypesWithProviders, collectProviders);
	return providersOut;
}
function processInjectorTypesWithProviders(typesWithProviders, visitor) {
	for (let i = 0; i < typesWithProviders.length; i++) {
		const { ngModule, providers } = typesWithProviders[i];
		deepForEachProvider(providers, (provider) => {
			ngDevMode && validateProvider(provider, providers || EMPTY_ARRAY, ngModule);
			visitor(provider, ngModule);
		});
	}
}
function walkProviderTree(container, visitor, parents, dedup) {
	container = resolveForwardRef(container);
	if (!container) return false;
	let defType = null;
	let injDef = getInjectorDef(container);
	const cmpDef = !injDef && getComponentDef(container);
	if (!injDef && !cmpDef) {
		const ngModule = container.ngModule;
		injDef = getInjectorDef(ngModule);
		if (injDef) defType = ngModule;
		else return false;
	} else if (cmpDef && !cmpDef.standalone) return false;
	else defType = container;
	if (ngDevMode && parents.indexOf(defType) !== -1) {
		const defName = stringify(defType);
		throw cyclicDependencyErrorWithDetails(defName, parents.map(stringify).concat(defName));
	}
	const isDuplicate = dedup.has(defType);
	if (cmpDef) {
		if (isDuplicate) return false;
		dedup.add(defType);
		if (cmpDef.dependencies) {
			const deps = typeof cmpDef.dependencies === "function" ? cmpDef.dependencies() : cmpDef.dependencies;
			for (const dep of deps) walkProviderTree(dep, visitor, parents, dedup);
		}
	} else if (injDef) {
		if (injDef.imports != null && !isDuplicate) {
			ngDevMode && parents.push(defType);
			dedup.add(defType);
			let importTypesWithProviders;
			try {
				deepForEach(injDef.imports, (imported) => {
					if (walkProviderTree(imported, visitor, parents, dedup)) {
						importTypesWithProviders ||= [];
						importTypesWithProviders.push(imported);
					}
				});
			} finally {
				ngDevMode && parents.pop();
			}
			if (importTypesWithProviders !== void 0) processInjectorTypesWithProviders(importTypesWithProviders, visitor);
		}
		if (!isDuplicate) {
			const factory = getFactoryDef(defType) || (() => new defType());
			visitor({
				provide: defType,
				useFactory: factory,
				deps: EMPTY_ARRAY
			}, defType);
			visitor({
				provide: INJECTOR_DEF_TYPES,
				useValue: defType,
				multi: true
			}, defType);
			visitor({
				provide: ENVIRONMENT_INITIALIZER,
				useValue: () => ɵɵinject(defType),
				multi: true
			}, defType);
		}
		const defProviders = injDef.providers;
		if (defProviders != null && !isDuplicate) {
			const injectorType = container;
			deepForEachProvider(defProviders, (provider) => {
				ngDevMode && validateProvider(provider, defProviders, injectorType);
				visitor(provider, injectorType);
			});
		}
	} else return false;
	return defType !== container && container.providers !== void 0;
}
function validateProvider(provider, providers, containerType) {
	if (isTypeProvider(provider) || isValueProvider(provider) || isFactoryProvider(provider) || isExistingProvider(provider)) return;
	if (!resolveForwardRef(provider && (provider.useClass || provider.provide))) throwInvalidProviderError(containerType, providers, provider);
}
function deepForEachProvider(providers, fn) {
	for (let provider of providers) {
		if (isEnvironmentProviders(provider)) provider = provider.ɵproviders;
		if (Array.isArray(provider)) deepForEachProvider(provider, fn);
		else fn(provider);
	}
}
var USE_VALUE = getClosureSafeProperty({
	provide: String,
	useValue: getClosureSafeProperty
});
function isValueProvider(value) {
	return value !== null && typeof value == "object" && USE_VALUE in value;
}
function isExistingProvider(value) {
	return !!(value && value.useExisting);
}
function isFactoryProvider(value) {
	return !!(value && value.useFactory);
}
function isTypeProvider(value) {
	return typeof value === "function";
}
function isClassProvider(value) {
	return !!value.useClass;
}
var INJECTOR_SCOPE = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "Set Injector scope." : "");
var NOT_YET = {};
var CIRCULAR = {};
var NULL_INJECTOR = void 0;
function getNullInjector() {
	if (NULL_INJECTOR === void 0) NULL_INJECTOR = new NullInjector();
	return NULL_INJECTOR;
}
var EnvironmentInjector = class {};
var R3Injector = class extends EnvironmentInjector {
	parent;
	source;
	scopes;
	records = /* @__PURE__ */ new Map();
	_ngOnDestroyHooks = /* @__PURE__ */ new Set();
	_onDestroyHooks = [];
	get destroyed() {
		return this._destroyed;
	}
	_destroyed = false;
	injectorDefTypes;
	constructor(providers, parent, source, scopes) {
		super();
		this.parent = parent;
		this.source = source;
		this.scopes = scopes;
		forEachSingleProvider(providers, (provider) => this.processProvider(provider));
		this.records.set(INJECTOR$1, makeRecord(void 0, this));
		if (scopes.has("environment")) this.records.set(EnvironmentInjector, makeRecord(void 0, this));
		const record = this.records.get(INJECTOR_SCOPE);
		if (record != null && typeof record.value === "string") this.scopes.add(record.value);
		this.injectorDefTypes = new Set(this.get(INJECTOR_DEF_TYPES, EMPTY_ARRAY, { self: true }));
	}
	retrieve(token, options) {
		const flags = convertToBitFlags(options) || 0;
		try {
			return this.get(token, THROW_IF_NOT_FOUND, flags);
		} catch (e) {
			if (isNotFound(e)) return e;
			throw e;
		}
	}
	destroy() {
		assertNotDestroyed(this);
		this._destroyed = true;
		const prevConsumer = setActiveConsumer(null);
		try {
			for (const service of this._ngOnDestroyHooks) service.ngOnDestroy();
			const onDestroyHooks = this._onDestroyHooks;
			this._onDestroyHooks = [];
			for (const hook of onDestroyHooks) hook();
		} finally {
			this.records.clear();
			this._ngOnDestroyHooks.clear();
			this.injectorDefTypes.clear();
			setActiveConsumer(prevConsumer);
		}
	}
	onDestroy(callback) {
		assertNotDestroyed(this);
		this._onDestroyHooks.push(callback);
		return () => this.removeOnDestroy(callback);
	}
	runInContext(fn) {
		assertNotDestroyed(this);
		const previousInjector = setCurrentInjector(this);
		const previousInjectImplementation = setInjectImplementation(void 0);
		let prevInjectContext;
		if (ngDevMode) prevInjectContext = setInjectorProfilerContext({
			injector: this,
			token: null
		});
		try {
			return fn();
		} finally {
			setCurrentInjector(previousInjector);
			setInjectImplementation(previousInjectImplementation);
			ngDevMode && setInjectorProfilerContext(prevInjectContext);
		}
	}
	get(token, notFoundValue = THROW_IF_NOT_FOUND, options) {
		assertNotDestroyed(this);
		if (token.hasOwnProperty(NG_ENV_ID)) return token[NG_ENV_ID](this);
		const flags = convertToBitFlags(options);
		let prevInjectContext;
		if (ngDevMode) prevInjectContext = setInjectorProfilerContext({
			injector: this,
			token
		});
		const previousInjector = setCurrentInjector(this);
		const previousInjectImplementation = setInjectImplementation(void 0);
		try {
			if (!(flags & 4)) {
				let record = this.records.get(token);
				if (record === void 0) {
					const def = couldBeInjectableType(token) && getInjectableDef(token);
					if (def && this.injectableDefInScope(def)) {
						if (ngDevMode) runInInjectorProfilerContext(this, token, () => {
							emitProviderConfiguredEvent(token);
						});
						record = makeRecord(injectableDefOrInjectorDefFactory(token), NOT_YET);
					} else record = null;
					this.records.set(token, record);
				}
				if (record != null) return this.hydrate(token, record, flags);
			}
			const nextInjector = !(flags & 2) ? this.parent : getNullInjector();
			notFoundValue = flags & 8 && notFoundValue === THROW_IF_NOT_FOUND ? null : notFoundValue;
			return nextInjector.get(token, notFoundValue);
		} catch (error) {
			const errorCode = getRuntimeErrorCode(error);
			if (errorCode === -200 || errorCode === -201) if (ngDevMode) {
				prependTokenToDependencyPath(error, token);
				if (previousInjector) throw error;
				else throw augmentRuntimeError(error, this.source);
			} else throw new RuntimeError(errorCode, null);
			else throw error;
		} finally {
			setInjectImplementation(previousInjectImplementation);
			setCurrentInjector(previousInjector);
			ngDevMode && setInjectorProfilerContext(prevInjectContext);
		}
	}
	resolveInjectorInitializers() {
		const prevConsumer = setActiveConsumer(null);
		const previousInjector = setCurrentInjector(this);
		const previousInjectImplementation = setInjectImplementation(void 0);
		let prevInjectContext;
		if (ngDevMode) prevInjectContext = setInjectorProfilerContext({
			injector: this,
			token: null
		});
		try {
			const initializers = this.get(ENVIRONMENT_INITIALIZER, EMPTY_ARRAY, { self: true });
			if (ngDevMode && !Array.isArray(initializers)) throw new RuntimeError(-209, `Unexpected type of the \`ENVIRONMENT_INITIALIZER\` token value (expected an array, but got ${typeof initializers}). Please check that the \`ENVIRONMENT_INITIALIZER\` token is configured as a \`multi: true\` provider.`);
			for (const initializer of initializers) initializer();
		} finally {
			setCurrentInjector(previousInjector);
			setInjectImplementation(previousInjectImplementation);
			ngDevMode && setInjectorProfilerContext(prevInjectContext);
			setActiveConsumer(prevConsumer);
		}
	}
	toString() {
		if (ngDevMode) {
			const tokens = [];
			const records = this.records;
			for (const token of records.keys()) tokens.push(stringify(token));
			return `R3Injector[${tokens.join(", ")}]`;
		}
		return "R3Injector[...]";
	}
	processProvider(provider) {
		provider = resolveForwardRef(provider);
		let token = isTypeProvider(provider) ? provider : resolveForwardRef(provider && provider.provide);
		const record = providerToRecord(provider);
		if (ngDevMode) runInInjectorProfilerContext(this, token, () => {
			if (isValueProvider(provider)) {
				emitInjectorToCreateInstanceEvent(token);
				emitInstanceCreatedByInjectorEvent(provider.useValue);
			}
			emitProviderConfiguredEvent(provider);
		});
		if (!isTypeProvider(provider) && provider.multi === true) {
			let multiRecord = this.records.get(token);
			if (multiRecord) {
				if (ngDevMode && multiRecord.multi === void 0) throwMixedMultiProviderError();
			} else {
				multiRecord = makeRecord(void 0, NOT_YET, true);
				multiRecord.factory = () => injectArgs(multiRecord.multi);
				this.records.set(token, multiRecord);
			}
			token = provider;
			multiRecord.multi.push(provider);
		} else if (ngDevMode) {
			const existing = this.records.get(token);
			if (existing && existing.multi !== void 0) throwMixedMultiProviderError();
		}
		this.records.set(token, record);
	}
	hydrate(token, record, flags) {
		const prevConsumer = setActiveConsumer(null);
		try {
			if (record.value === CIRCULAR) throw cyclicDependencyError(ngDevMode ? stringify(token) : "");
			else if (record.value === NOT_YET) {
				record.value = CIRCULAR;
				if (ngDevMode) runInInjectorProfilerContext(this, token, () => {
					emitInjectorToCreateInstanceEvent(token);
					record.value = record.factory(void 0, flags);
					emitInstanceCreatedByInjectorEvent(record.value);
				});
				else record.value = record.factory(void 0, flags);
			}
			if (typeof record.value === "object" && record.value && hasOnDestroy(record.value)) this._ngOnDestroyHooks.add(record.value);
			return record.value;
		} finally {
			setActiveConsumer(prevConsumer);
		}
	}
	injectableDefInScope(def) {
		if (!def.providedIn) return false;
		const providedIn = resolveForwardRef(def.providedIn);
		if (typeof providedIn === "string") return providedIn === "any" || this.scopes.has(providedIn);
		else return this.injectorDefTypes.has(providedIn);
	}
	removeOnDestroy(callback) {
		const destroyCBIdx = this._onDestroyHooks.indexOf(callback);
		if (destroyCBIdx !== -1) this._onDestroyHooks.splice(destroyCBIdx, 1);
	}
};
function injectableDefOrInjectorDefFactory(token) {
	const injectableDef = getInjectableDef(token);
	const factory = injectableDef !== null ? injectableDef.factory : getFactoryDef(token);
	if (factory !== null) return factory;
	if (token instanceof InjectionToken) throw new RuntimeError(-204, ngDevMode && `Token ${stringify(token)} is missing a ɵprov definition.`);
	if (token instanceof Function) return getUndecoratedInjectableFactory(token);
	throw new RuntimeError(-204, ngDevMode && "unreachable");
}
function getUndecoratedInjectableFactory(token) {
	const paramLength = token.length;
	if (paramLength > 0) throw new RuntimeError(-204, ngDevMode && `Can't resolve all parameters for ${stringify(token)}: (${newArray(paramLength, "?").join(", ")}).`);
	const inheritedInjectableDef = getInheritedInjectableDef(token);
	if (inheritedInjectableDef !== null) return () => inheritedInjectableDef.factory(token);
	else return () => new token();
}
function providerToRecord(provider) {
	if (isValueProvider(provider)) return makeRecord(void 0, provider.useValue);
	else return makeRecord(providerToFactory(provider), NOT_YET);
}
function providerToFactory(provider, ngModuleType, providers) {
	let factory = void 0;
	if (ngDevMode && isEnvironmentProviders(provider)) throwInvalidProviderError(void 0, providers, provider);
	if (isTypeProvider(provider)) {
		const unwrappedProvider = resolveForwardRef(provider);
		return getFactoryDef(unwrappedProvider) || injectableDefOrInjectorDefFactory(unwrappedProvider);
	} else if (isValueProvider(provider)) factory = () => resolveForwardRef(provider.useValue);
	else if (isFactoryProvider(provider)) factory = () => provider.useFactory(...injectArgs(provider.deps || []));
	else if (isExistingProvider(provider)) factory = (_, flags) => ɵɵinject(resolveForwardRef(provider.useExisting), flags !== void 0 && flags & 8 ? 8 : void 0);
	else {
		const classRef = resolveForwardRef(provider && (provider.useClass || provider.provide));
		if (ngDevMode && !classRef) throwInvalidProviderError(ngModuleType, providers, provider);
		if (hasDeps(provider)) factory = () => new classRef(...injectArgs(provider.deps));
		else return getFactoryDef(classRef) || injectableDefOrInjectorDefFactory(classRef);
	}
	return factory;
}
function assertNotDestroyed(injector) {
	if (injector.destroyed) throw new RuntimeError(-205, ngDevMode && "Injector has already been destroyed.");
}
function makeRecord(factory, value, multi = false) {
	return {
		factory,
		value,
		multi: multi ? [] : void 0
	};
}
function hasDeps(value) {
	return !!value.deps;
}
function hasOnDestroy(value) {
	return value !== null && typeof value === "object" && typeof value.ngOnDestroy === "function";
}
function couldBeInjectableType(value) {
	return typeof value === "function" || typeof value === "object" && value.ngMetadataName === "InjectionToken";
}
function forEachSingleProvider(providers, fn) {
	for (const provider of providers) if (Array.isArray(provider)) forEachSingleProvider(provider, fn);
	else if (provider && isEnvironmentProviders(provider)) forEachSingleProvider(provider.ɵproviders, fn);
	else fn(provider);
}
function runInInjectionContext(injector, fn) {
	let internalInjector;
	if (injector instanceof R3Injector) {
		assertNotDestroyed(injector);
		internalInjector = injector;
	} else internalInjector = new RetrievingInjector(injector);
	let prevInjectorProfilerContext;
	if (ngDevMode) prevInjectorProfilerContext = setInjectorProfilerContext({
		injector,
		token: null
	});
	const prevInjector = setCurrentInjector(internalInjector);
	const previousInjectImplementation = setInjectImplementation(void 0);
	try {
		return fn();
	} finally {
		setCurrentInjector(prevInjector);
		ngDevMode && setInjectorProfilerContext(prevInjectorProfilerContext);
		setInjectImplementation(previousInjectImplementation);
	}
}
function isInInjectionContext() {
	return getInjectImplementation() !== void 0 || getCurrentInjector() != null;
}
function assertInInjectionContext(debugFn) {
	if (!isInInjectionContext()) throw new RuntimeError(-203, ngDevMode && debugFn.name + "() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`");
}
var TYPE = 1;
var CONTAINER_HEADER_OFFSET = 10;
function isLView(value) {
	return Array.isArray(value) && typeof value[TYPE] === "object";
}
function isLContainer(value) {
	return Array.isArray(value) && value[TYPE] === true;
}
function isContentQueryHost(tNode) {
	return (tNode.flags & 4) !== 0;
}
function isComponentHost(tNode) {
	return tNode.componentOffset > -1;
}
function isDirectiveHost(tNode) {
	return (tNode.flags & 1) === 1;
}
function isComponentDef(def) {
	return !!def.template;
}
function isRootView(target) {
	return (target[2] & 512) !== 0;
}
function isProjectionTNode(tNode) {
	return (tNode.type & 16) === 16;
}
function hasI18n(lView) {
	return (lView[2] & 32) === 32;
}
function isDestroyed(lView) {
	return (lView[2] & 256) === 256;
}
function assertTNodeForLView(tNode, lView) {
	assertTNodeForTView(tNode, lView[1]);
}
function assertTNodeCreationIndex(lView, index) {
	const adjustedIndex = index + 27;
	assertIndexInRange(lView, adjustedIndex);
	assertLessThan(adjustedIndex, lView[1].bindingStartIndex, "TNodes should be created before any bindings");
}
function assertTNodeForTView(tNode, tView) {
	assertTNode(tNode);
	const tData = tView.data;
	for (let i = 27; i < tData.length; i++) if (tData[i] === tNode) return;
	throwError("This TNode does not belong to this TView.");
}
function assertTNode(tNode) {
	assertDefined(tNode, "TNode must be defined");
	if (!(tNode && typeof tNode === "object" && tNode.hasOwnProperty("directiveStylingLast"))) throwError("Not of type TNode, got: " + tNode);
}
function assertTIcu(tIcu) {
	assertDefined(tIcu, "Expected TIcu to be defined");
	if (!(typeof tIcu.currentCaseLViewIndex === "number")) throwError("Object is not of TIcu type.");
}
function assertNgModuleType(actual, msg = "Type passed in is not NgModuleType, it does not have 'ɵmod' property.") {
	if (!getNgModuleDef(actual)) throwError(msg);
}
function assertHasParent(tNode) {
	assertDefined(tNode, "currentTNode should exist!");
	assertDefined(tNode.parent, "currentTNode should have a parent");
}
function assertLContainer(value) {
	assertDefined(value, "LContainer must be defined");
	assertEqual(isLContainer(value), true, "Expecting LContainer");
}
function assertLViewOrUndefined(value) {
	value && assertEqual(isLView(value), true, "Expecting LView or undefined or null");
}
function assertLView(value) {
	assertDefined(value, "LView must be defined");
	assertEqual(isLView(value), true, "Expecting LView");
}
function assertFirstCreatePass(tView, errMessage) {
	assertEqual(tView.firstCreatePass, true, errMessage || "Should only be called in first create pass.");
}
function assertFirstUpdatePass(tView, errMessage) {
	assertEqual(tView.firstUpdatePass, true, "Should only be called in first update pass.");
}
function assertDirectiveDef(obj) {
	if (obj.type === void 0 || obj.selectors == void 0 || obj.inputs === void 0) throwError(`Expected a DirectiveDef/ComponentDef and this object does not seem to have the expected shape.`);
}
function assertIndexInDeclRange(tView, index) {
	assertBetween(27, tView.bindingStartIndex, index);
}
function assertIndexInExpandoRange(lView, index) {
	const tView = lView[1];
	assertBetween(tView.expandoStartIndex, lView.length, index);
}
function assertBetween(lower, upper, index) {
	if (!(lower <= index && index < upper)) throwError(`Index out of range (expecting ${lower} <= ${index} < ${upper})`);
}
function assertProjectionSlots(lView, errMessage) {
	assertDefined(lView[15], "Component views should exist.");
	assertDefined(lView[15][5].projection, "Components with projection nodes (<ng-content>) must have projection slots defined.");
}
function assertParentView(lView, errMessage) {
	assertDefined(lView, "Component views should always have a parent view (component's host view)");
}
function assertNodeInjector(lView, injectorIndex) {
	assertIndexInExpandoRange(lView, injectorIndex);
	assertIndexInExpandoRange(lView, injectorIndex + 8);
	assertNumber(lView[injectorIndex + 0], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 1], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 2], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 3], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 4], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 5], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 6], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 7], "injectorIndex should point to a bloom filter");
	assertNumber(lView[injectorIndex + 8], "injectorIndex should point to parent injector");
}
var SecurityContext;
(function(SecurityContext) {
	SecurityContext[SecurityContext["NONE"] = 0] = "NONE";
	SecurityContext[SecurityContext["HTML"] = 1] = "HTML";
	SecurityContext[SecurityContext["STYLE"] = 2] = "STYLE";
	SecurityContext[SecurityContext["SCRIPT"] = 3] = "SCRIPT";
	SecurityContext[SecurityContext["URL"] = 4] = "URL";
	SecurityContext[SecurityContext["RESOURCE_URL"] = 5] = "RESOURCE_URL";
	SecurityContext[SecurityContext["ATTRIBUTE_NO_BINDING"] = 6] = "ATTRIBUTE_NO_BINDING";
})(SecurityContext || (SecurityContext = {}));
var _SECURITY_SCHEMA;
var MATH_ML_NAMESPACE = "math";
var NO_NAMESPACE = "";
var MATCH_ALL_ELEMENTS = "*";
var createNullObj = () => Object.create(null);
function SECURITY_SCHEMA() {
	if (_SECURITY_SCHEMA) return _SECURITY_SCHEMA;
	_SECURITY_SCHEMA = createNullObj();
	registerContext(SecurityContext.HTML, void 0, [["iframe", ["srcdoc"]], ["*", ["innerHTML", "outerHTML"]]]);
	registerContext(SecurityContext.STYLE, void 0, [["*", ["style"]]]);
	registerContext(SecurityContext.URL, void 0, [
		["*", ["formAction"]],
		["area", ["href"]],
		["a", ["href", "xlink:href"]],
		["form", ["action"]],
		["img", ["src"]],
		["video", ["src"]]
	]);
	registerContext(SecurityContext.URL, MATH_ML_NAMESPACE, [["*", ["href", "xlink:href"]]]);
	registerContext(SecurityContext.RESOURCE_URL, void 0, [
		["base", ["href"]],
		["embed", ["src"]],
		["frame", ["src"]],
		["iframe", ["src"]],
		["link", ["href"]],
		["object", ["codebase", "data"]]
	]);
	registerContext(SecurityContext.URL, "svg", [["a", ["href", "xlink:href"]]]);
	registerContext(SecurityContext.ATTRIBUTE_NO_BINDING, "svg", [
		["animate", [
			"attributeName",
			"values",
			"to",
			"from"
		]],
		["set", ["to", "attributeName"]],
		["animateMotion", ["attributeName"]],
		["animateTransform", ["attributeName"]]
	]);
	registerContext(SecurityContext.ATTRIBUTE_NO_BINDING, void 0, [["unknown", [
		"attributeName",
		"values",
		"to",
		"from",
		"sandbox",
		"allow",
		"allowFullscreen",
		"referrerPolicy",
		"csp",
		"fetchPriority",
		"credentialless"
	]], ["iframe", [
		"sandbox",
		"allow",
		"allowFullscreen",
		"referrerPolicy",
		"csp",
		"fetchPriority",
		"credentialless"
	]]]);
	return _SECURITY_SCHEMA;
}
function registerContext(ctx, namespace, specs) {
	const nsKey = namespace ?? NO_NAMESPACE;
	for (const [element, attributeNames] of specs) {
		const tagName = element.toLowerCase();
		for (const attr of attributeNames) {
			const attrLower = attr.toLowerCase();
			const attrSchema = _SECURITY_SCHEMA[attrLower] ??= createNullObj();
			const nsSchema = attrSchema[nsKey] ??= createNullObj();
			nsSchema[tagName] = ctx;
		}
	}
}
function checkSecurityContext(tagName, propName, namespace) {
	const attrSchema = SECURITY_SCHEMA()[propName.toLowerCase()];
	if (!attrSchema) return SecurityContext.NONE;
	const tagLower = tagName.toLowerCase();
	let context;
	if (namespace) {
		const nsSchema = attrSchema[namespace];
		if (nsSchema) context = nsSchema[tagLower] ?? nsSchema[MATCH_ALL_ELEMENTS];
	}
	if (context === void 0) {
		const defaultSchema = attrSchema[NO_NAMESPACE];
		if (defaultSchema) context = defaultSchema[tagLower] ?? defaultSchema[MATCH_ALL_ELEMENTS];
	}
	return context ?? SecurityContext.NONE;
}
function unwrapRNode(value) {
	while (Array.isArray(value)) value = value[0];
	return value;
}
function unwrapLView(value) {
	while (Array.isArray(value)) {
		if (typeof value[TYPE] === "object") return value;
		value = value[0];
	}
	return null;
}
function getNativeByIndex(index, lView) {
	ngDevMode && assertIndexInRange(lView, index);
	ngDevMode && assertGreaterThanOrEqual(index, 27, "Expected to be past HEADER_OFFSET");
	return unwrapRNode(lView[index]);
}
function getNativeByTNode(tNode, lView) {
	ngDevMode && assertTNodeForLView(tNode, lView);
	ngDevMode && assertIndexInRange(lView, tNode.index);
	return unwrapRNode(lView[tNode.index]);
}
function getNativeByTNodeOrNull(tNode, lView) {
	const index = tNode === null ? -1 : tNode.index;
	if (index !== -1) {
		ngDevMode && assertTNodeForLView(tNode, lView);
		return unwrapRNode(lView[index]);
	}
	return null;
}
function getTNode(tView, index) {
	ngDevMode && assertGreaterThan(index, -1, "wrong index for TNode");
	ngDevMode && assertLessThan(index, tView.data.length, "wrong index for TNode");
	const tNode = tView.data[index];
	ngDevMode && tNode !== null && assertTNode(tNode);
	return tNode;
}
function load(view, index) {
	ngDevMode && assertIndexInRange(view, index);
	return view[index];
}
function store(tView, lView, index, value) {
	if (index >= tView.data.length) {
		tView.data[index] = null;
		tView.blueprint[index] = null;
	}
	lView[index] = value;
}
function getComponentLViewByIndex(nodeIndex, hostView) {
	ngDevMode && assertIndexInRange(hostView, nodeIndex);
	const slotValue = hostView[nodeIndex];
	return isLView(slotValue) ? slotValue : slotValue[0];
}
function isCreationMode(view) {
	return (view[2] & 4) === 4;
}
function viewAttachedToChangeDetector(view) {
	return (view[2] & 128) === 128;
}
function viewAttachedToContainer(view) {
	return isLContainer(view[3]);
}
function getConstant(consts, index) {
	if (index === null || index === void 0) return null;
	ngDevMode && assertIndexInRange(consts, index);
	return consts[index];
}
function resetPreOrderHookFlags(lView) {
	lView[17] = 0;
}
function markViewForRefresh(lView) {
	if (lView[2] & 1024) return;
	lView[2] |= 1024;
	if (viewAttachedToChangeDetector(lView)) markAncestorsForTraversal(lView);
}
function walkUpViews(nestingLevel, currentView) {
	while (nestingLevel > 0) {
		ngDevMode && assertDefined(currentView[14], "Declaration view should be defined if nesting level is greater than 0.");
		currentView = currentView[14];
		nestingLevel--;
	}
	return currentView;
}
function requiresRefreshOrTraversal(lView) {
	return !!(lView[2] & 9216 || lView[24]?.dirty);
}
function updateAncestorTraversalFlagsOnAttach(lView) {
	lView[10].changeDetectionScheduler?.notify(8);
	if (lView[2] & 64) lView[2] |= 1024;
	if (requiresRefreshOrTraversal(lView)) markAncestorsForTraversal(lView);
}
function markAncestorsForTraversal(lView) {
	lView[10].changeDetectionScheduler?.notify(0);
	let parent = getLViewParent(lView);
	while (parent !== null) {
		if (parent[2] & 8192) break;
		parent[2] |= 8192;
		if (!viewAttachedToChangeDetector(parent)) break;
		parent = getLViewParent(parent);
	}
}
function storeLViewOnDestroy(lView, onDestroyCallback) {
	if (isDestroyed(lView)) throw new RuntimeError(911, ngDevMode && "View has already been destroyed.");
	if (lView[21] === null) lView[21] = [];
	lView[21].push(onDestroyCallback);
}
function removeLViewOnDestroy(lView, onDestroyCallback) {
	if (lView[21] === null) return;
	const destroyCBIdx = lView[21].indexOf(onDestroyCallback);
	if (destroyCBIdx !== -1) lView[21].splice(destroyCBIdx, 1);
}
function getLViewParent(lView) {
	ngDevMode && assertLView(lView);
	const parent = lView[3];
	return isLContainer(parent) ? parent[3] : parent;
}
function getOrCreateLViewCleanup(view) {
	return view[7] ??= [];
}
function getOrCreateTViewCleanup(tView) {
	return tView.cleanup ??= [];
}
function storeCleanupWithContext(tView, lView, context, cleanupFn) {
	const lCleanup = getOrCreateLViewCleanup(lView);
	ngDevMode && assertDefined(context, "Cleanup context is mandatory when registering framework-level destroy hooks");
	lCleanup.push(context);
	if (tView.firstCreatePass) getOrCreateTViewCleanup(tView).push(cleanupFn, lCleanup.length - 1);
	else if (ngDevMode) Object.freeze(getOrCreateTViewCleanup(tView));
}
var instructionState = {
	lFrame: createLFrame(null),
	bindingsEnabled: true,
	skipHydrationRootTNode: null
};
var CheckNoChangesMode;
(function(CheckNoChangesMode) {
	CheckNoChangesMode[CheckNoChangesMode["Off"] = 0] = "Off";
	CheckNoChangesMode[CheckNoChangesMode["Exhaustive"] = 1] = "Exhaustive";
	CheckNoChangesMode[CheckNoChangesMode["OnlyDirtyViews"] = 2] = "OnlyDirtyViews";
})(CheckNoChangesMode || (CheckNoChangesMode = {}));
var _checkNoChangesMode = 0;
var _isRefreshingViews = false;
function getElementDepthCount() {
	return instructionState.lFrame.elementDepthCount;
}
function increaseElementDepthCount() {
	instructionState.lFrame.elementDepthCount++;
}
function decreaseElementDepthCount() {
	instructionState.lFrame.elementDepthCount--;
}
function getBindingsEnabled() {
	return instructionState.bindingsEnabled;
}
function isInSkipHydrationBlock() {
	return instructionState.skipHydrationRootTNode !== null;
}
function isSkipHydrationRootTNode(tNode) {
	return instructionState.skipHydrationRootTNode === tNode;
}
function ɵɵenableBindings() {
	instructionState.bindingsEnabled = true;
}
function enterSkipHydrationBlock(tNode) {
	instructionState.skipHydrationRootTNode = tNode;
}
function ɵɵdisableBindings() {
	instructionState.bindingsEnabled = false;
}
function leaveSkipHydrationBlock() {
	instructionState.skipHydrationRootTNode = null;
}
function getLView() {
	return instructionState.lFrame.lView;
}
function getTView() {
	return instructionState.lFrame.tView;
}
function ɵɵrestoreView(viewToRestore) {
	instructionState.lFrame.contextLView = viewToRestore;
	return viewToRestore[8];
}
function ɵɵresetView(value) {
	instructionState.lFrame.contextLView = null;
	return value;
}
function getCurrentTNode() {
	let currentTNode = getCurrentTNodePlaceholderOk();
	while (currentTNode !== null && currentTNode.type === 64) currentTNode = currentTNode.parent;
	return currentTNode;
}
function getCurrentTNodePlaceholderOk() {
	return instructionState.lFrame.currentTNode;
}
function getCurrentParentTNode() {
	const lFrame = instructionState.lFrame;
	const currentTNode = lFrame.currentTNode;
	return lFrame.isParent ? currentTNode : currentTNode.parent;
}
function setCurrentTNode(tNode, isParent) {
	ngDevMode && tNode && assertTNodeForTView(tNode, instructionState.lFrame.tView);
	const lFrame = instructionState.lFrame;
	lFrame.currentTNode = tNode;
	lFrame.isParent = isParent;
}
function isCurrentTNodeParent() {
	return instructionState.lFrame.isParent;
}
function setCurrentTNodeAsNotParent() {
	instructionState.lFrame.isParent = false;
}
function getContextLView() {
	const contextLView = instructionState.lFrame.contextLView;
	ngDevMode && assertDefined(contextLView, "contextLView must be defined.");
	return contextLView;
}
function isInCheckNoChangesMode() {
	!ngDevMode && throwError("Must never be called in production mode");
	return _checkNoChangesMode !== CheckNoChangesMode.Off;
}
function isExhaustiveCheckNoChanges() {
	!ngDevMode && throwError("Must never be called in production mode");
	return _checkNoChangesMode === CheckNoChangesMode.Exhaustive;
}
function setIsInCheckNoChangesMode(mode) {
	!ngDevMode && throwError("Must never be called in production mode");
	_checkNoChangesMode = mode;
}
function isRefreshingViews() {
	return _isRefreshingViews;
}
function setIsRefreshingViews(mode) {
	const prev = _isRefreshingViews;
	_isRefreshingViews = mode;
	return prev;
}
function getBindingRoot() {
	const lFrame = instructionState.lFrame;
	let index = lFrame.bindingRootIndex;
	if (index === -1) index = lFrame.bindingRootIndex = lFrame.tView.bindingStartIndex;
	return index;
}
function getBindingIndex() {
	return instructionState.lFrame.bindingIndex;
}
function setBindingIndex(value) {
	return instructionState.lFrame.bindingIndex = value;
}
function nextBindingIndex() {
	return instructionState.lFrame.bindingIndex++;
}
function incrementBindingIndex(count) {
	const lFrame = instructionState.lFrame;
	const index = lFrame.bindingIndex;
	lFrame.bindingIndex = lFrame.bindingIndex + count;
	return index;
}
function isInI18nBlock() {
	return instructionState.lFrame.inI18n;
}
function setInI18nBlock(isInI18nBlock) {
	instructionState.lFrame.inI18n = isInI18nBlock;
}
function setBindingRootForHostBindings(bindingRootIndex, currentDirectiveIndex) {
	const lFrame = instructionState.lFrame;
	lFrame.bindingIndex = lFrame.bindingRootIndex = bindingRootIndex;
	setCurrentDirectiveIndex(currentDirectiveIndex);
}
function getCurrentDirectiveIndex() {
	return instructionState.lFrame.currentDirectiveIndex;
}
function setCurrentDirectiveIndex(currentDirectiveIndex) {
	instructionState.lFrame.currentDirectiveIndex = currentDirectiveIndex;
}
function getCurrentDirectiveDef(tData) {
	const currentDirectiveIndex = instructionState.lFrame.currentDirectiveIndex;
	return currentDirectiveIndex === -1 ? null : tData[currentDirectiveIndex];
}
function getCurrentQueryIndex() {
	return instructionState.lFrame.currentQueryIndex;
}
function setCurrentQueryIndex(value) {
	instructionState.lFrame.currentQueryIndex = value;
}
function getDeclarationTNode(lView) {
	const tView = lView[1];
	if (tView.type === 2) {
		ngDevMode && assertDefined(tView.declTNode, "Embedded TNodes should have declaration parents.");
		return tView.declTNode;
	}
	if (tView.type === 1) return lView[5];
	return null;
}
function enterDI(lView, tNode, flags) {
	ngDevMode && assertLViewOrUndefined(lView);
	if (flags & 4) {
		ngDevMode && assertTNodeForTView(tNode, lView[1]);
		let parentTNode = tNode;
		let parentLView = lView;
		while (true) {
			ngDevMode && assertDefined(parentTNode, "Parent TNode should be defined");
			parentTNode = parentTNode.parent;
			if (parentTNode === null && !(flags & 1)) {
				parentTNode = getDeclarationTNode(parentLView);
				if (parentTNode === null) break;
				ngDevMode && assertDefined(parentLView, "Parent LView should be defined");
				parentLView = parentLView[14];
				if (parentTNode.type & 10) break;
			} else break;
		}
		if (parentTNode === null) return false;
		else {
			tNode = parentTNode;
			lView = parentLView;
		}
	}
	ngDevMode && assertTNodeForLView(tNode, lView);
	const lFrame = instructionState.lFrame = allocLFrame();
	lFrame.currentTNode = tNode;
	lFrame.lView = lView;
	return true;
}
function enterView(newView) {
	ngDevMode && assertNotEqual(newView[0], newView[1], "????");
	ngDevMode && assertLViewOrUndefined(newView);
	const newLFrame = allocLFrame();
	if (ngDevMode) {
		assertEqual(newLFrame.isParent, true, "Expected clean LFrame");
		assertEqual(newLFrame.lView, null, "Expected clean LFrame");
		assertEqual(newLFrame.tView, null, "Expected clean LFrame");
		assertEqual(newLFrame.selectedIndex, -1, "Expected clean LFrame");
		assertEqual(newLFrame.elementDepthCount, 0, "Expected clean LFrame");
		assertEqual(newLFrame.currentDirectiveIndex, -1, "Expected clean LFrame");
		assertEqual(newLFrame.currentNamespace, null, "Expected clean LFrame");
		assertEqual(newLFrame.bindingRootIndex, -1, "Expected clean LFrame");
		assertEqual(newLFrame.currentQueryIndex, 0, "Expected clean LFrame");
	}
	const tView = newView[1];
	instructionState.lFrame = newLFrame;
	ngDevMode && tView.firstChild && assertTNodeForTView(tView.firstChild, tView);
	newLFrame.currentTNode = tView.firstChild;
	newLFrame.lView = newView;
	newLFrame.tView = tView;
	newLFrame.contextLView = newView;
	newLFrame.bindingIndex = tView.bindingStartIndex;
	newLFrame.inI18n = false;
}
function allocLFrame() {
	const currentLFrame = instructionState.lFrame;
	const childLFrame = currentLFrame === null ? null : currentLFrame.child;
	return childLFrame === null ? createLFrame(currentLFrame) : childLFrame;
}
function createLFrame(parent) {
	const lFrame = {
		currentTNode: null,
		isParent: true,
		lView: null,
		tView: null,
		selectedIndex: -1,
		contextLView: null,
		elementDepthCount: 0,
		currentNamespace: null,
		currentDirectiveIndex: -1,
		bindingRootIndex: -1,
		bindingIndex: -1,
		currentQueryIndex: 0,
		parent,
		child: null,
		inI18n: false
	};
	parent !== null && (parent.child = lFrame);
	return lFrame;
}
function leaveViewLight() {
	const oldLFrame = instructionState.lFrame;
	instructionState.lFrame = oldLFrame.parent;
	oldLFrame.currentTNode = null;
	oldLFrame.lView = null;
	return oldLFrame;
}
var leaveDI = leaveViewLight;
function leaveView() {
	const oldLFrame = leaveViewLight();
	oldLFrame.isParent = true;
	oldLFrame.tView = null;
	oldLFrame.selectedIndex = -1;
	oldLFrame.contextLView = null;
	oldLFrame.elementDepthCount = 0;
	oldLFrame.currentDirectiveIndex = -1;
	oldLFrame.currentNamespace = null;
	oldLFrame.bindingRootIndex = -1;
	oldLFrame.bindingIndex = -1;
	oldLFrame.currentQueryIndex = 0;
}
function nextContextImpl(level) {
	return (instructionState.lFrame.contextLView = walkUpViews(level, instructionState.lFrame.contextLView))[8];
}
function getSelectedIndex() {
	return instructionState.lFrame.selectedIndex;
}
function setSelectedIndex(index) {
	ngDevMode && index !== -1 && assertGreaterThanOrEqual(index, 27, "Index must be past HEADER_OFFSET (or -1).");
	ngDevMode && assertLessThan(index, instructionState.lFrame.lView.length, "Can't set index passed end of LView");
	instructionState.lFrame.selectedIndex = index;
}
function getSelectedTNode() {
	const lFrame = instructionState.lFrame;
	return getTNode(lFrame.tView, lFrame.selectedIndex);
}
function ɵɵnamespaceSVG() {
	instructionState.lFrame.currentNamespace = "svg";
}
function ɵɵnamespaceMathML() {
	instructionState.lFrame.currentNamespace = MATH_ML_NAMESPACE;
}
function ɵɵnamespaceHTML() {
	namespaceHTMLInternal();
}
function namespaceHTMLInternal() {
	instructionState.lFrame.currentNamespace = null;
}
function getNamespace() {
	return instructionState.lFrame.currentNamespace;
}
var _wasLastNodeCreated = true;
function wasLastNodeCreated() {
	return _wasLastNodeCreated;
}
function lastNodeWasCreated(flag) {
	_wasLastNodeCreated = flag;
}
function promiseWithResolvers() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
function createInjector(defType, parent = null, additionalProviders = null, name) {
	const injector = createInjectorWithoutInjectorInstances(defType, parent, additionalProviders, name);
	injector.resolveInjectorInitializers();
	return injector;
}
function createInjectorWithoutInjectorInstances(defType, parent = null, additionalProviders = null, name, scopes = /* @__PURE__ */ new Set()) {
	const providers = [additionalProviders || EMPTY_ARRAY, importProvidersFrom(defType)];
	let source = void 0;
	if (ngDevMode) source = name || (typeof defType === "object" ? void 0 : stringify(defType));
	return new R3Injector(providers, parent || getNullInjector(), source || null, scopes);
}
var specialProviders = /* @__PURE__ */ new Set();
function registerSpecialProvider(clazz) {
	if (typeof ngDevMode !== "undefined" && ngDevMode) specialProviders.add(clazz);
}
function getAllSpecialProviders() {
	return specialProviders;
}
var Injector = class Injector {
	static THROW_IF_NOT_FOUND = THROW_IF_NOT_FOUND;
	static NULL = new NullInjector();
	static create(options, parent) {
		if (Array.isArray(options)) return createInjector({ name: "" }, parent, options, "");
		else {
			const name = options.name ?? "";
			return createInjector({ name }, options.parent, options.providers, name);
		}
	}
	static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
		token: Injector,
		providedIn: "any",
		factory: () => ɵɵinject(INJECTOR$1)
	});
	static __NG_ELEMENT_ID__ = -1;
};
if (typeof ngDevMode === "undefined" || ngDevMode) registerSpecialProvider(Injector);
var DOCUMENT = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "DocumentToken" : "");
var DestroyRef = class {
	static __NG_ELEMENT_ID__ = injectDestroyRef;
	static __NG_ENV_ID__ = (injector) => injector;
};
if (typeof ngDevMode === "undefined" || ngDevMode) registerSpecialProvider(DestroyRef);
var NodeInjectorDestroyRef = class extends DestroyRef {
	_lView;
	constructor(_lView) {
		super();
		this._lView = _lView;
	}
	get destroyed() {
		return isDestroyed(this._lView);
	}
	onDestroy(callback) {
		const lView = this._lView;
		storeLViewOnDestroy(lView, callback);
		return () => removeLViewOnDestroy(lView, callback);
	}
};
function injectDestroyRef() {
	return new NodeInjectorDestroyRef(getLView());
}
var DEBUG_TASK_TRACKER = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "DEBUG_TASK_TRACKER" : "");
var PendingTasksInternal = class PendingTasksInternal {
	taskId = 0;
	pendingTasks = /* @__PURE__ */ new Set();
	destroyed = false;
	pendingTask = new BehaviorSubject(false);
	debugTaskTracker = inject(DEBUG_TASK_TRACKER, { optional: true });
	get hasPendingTasks() {
		return this.destroyed ? false : this.pendingTask.value;
	}
	get hasPendingTasksObservable() {
		if (this.destroyed) return new Observable((subscriber) => {
			subscriber.next(false);
			subscriber.complete();
		});
		return this.pendingTask;
	}
	add() {
		if (!this.hasPendingTasks && !this.destroyed) this.pendingTask.next(true);
		const taskId = this.taskId++;
		this.pendingTasks.add(taskId);
		this.debugTaskTracker?.add(taskId);
		return taskId;
	}
	has(taskId) {
		return this.pendingTasks.has(taskId);
	}
	remove(taskId) {
		this.pendingTasks.delete(taskId);
		this.debugTaskTracker?.remove(taskId);
		if (this.pendingTasks.size === 0 && this.hasPendingTasks) this.pendingTask.next(false);
	}
	ngOnDestroy() {
		this.pendingTasks.clear();
		if (this.hasPendingTasks) this.pendingTask.next(false);
		this.destroyed = true;
		this.pendingTask.unsubscribe();
	}
	static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
		token: PendingTasksInternal,
		providedIn: "root",
		factory: () => new PendingTasksInternal()
	});
};
var EventEmitter_ = class extends Subject {
	__isAsync;
	destroyRef = void 0;
	pendingTasks = void 0;
	constructor(isAsync = false) {
		super();
		this.__isAsync = isAsync;
		if (isInInjectionContext()) {
			this.destroyRef = inject(DestroyRef, { optional: true }) ?? void 0;
			this.pendingTasks = inject(PendingTasksInternal, { optional: true }) ?? void 0;
		}
	}
	emit(value) {
		const prevConsumer = setActiveConsumer(null);
		try {
			super.next(value);
		} finally {
			setActiveConsumer(prevConsumer);
		}
	}
	subscribe(observerOrNext, error, complete) {
		let nextFn = observerOrNext;
		let errorFn = error || (() => null);
		let completeFn = complete;
		if (observerOrNext && typeof observerOrNext === "object") {
			const observer = observerOrNext;
			nextFn = observer.next?.bind(observer);
			errorFn = observer.error?.bind(observer);
			completeFn = observer.complete?.bind(observer);
		}
		if (this.__isAsync) {
			errorFn = this.wrapInTimeout(errorFn);
			if (nextFn) nextFn = this.wrapInTimeout(nextFn);
			if (completeFn) completeFn = this.wrapInTimeout(completeFn);
		}
		const sink = super.subscribe({
			next: nextFn,
			error: errorFn,
			complete: completeFn
		});
		if (observerOrNext instanceof Subscription) observerOrNext.add(sink);
		return sink;
	}
	wrapInTimeout(fn) {
		return (value) => {
			const taskId = this.pendingTasks?.add();
			setTimeout(() => {
				try {
					fn(value);
				} finally {
					if (taskId !== void 0) this.pendingTasks?.remove(taskId);
				}
			});
		};
	}
};
var EventEmitter = EventEmitter_;
function noop(...args) {}
function scheduleCallbackWithRafRace(callback) {
	let timeoutId;
	let animationFrameId;
	function cleanup() {
		callback = noop;
		try {
			if (animationFrameId !== void 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(animationFrameId);
			if (timeoutId !== void 0) clearTimeout(timeoutId);
		} catch {}
	}
	timeoutId = setTimeout(() => {
		callback();
		cleanup();
	});
	if (typeof requestAnimationFrame === "function") animationFrameId = requestAnimationFrame(() => {
		callback();
		cleanup();
	});
	return () => cleanup();
}
function scheduleCallbackWithMicrotask(callback) {
	queueMicrotask(() => callback());
	return () => {
		callback = noop;
	};
}
var AsyncStackTaggingZoneSpec = class {
	createTask;
	constructor(namePrefix, consoleAsyncStackTaggingImpl = console) {
		this.name = "asyncStackTagging for " + namePrefix;
		this.createTask = consoleAsyncStackTaggingImpl?.createTask ?? (() => null);
	}
	name;
	onScheduleTask(delegate, _current, target, task) {
		task.consoleTask = this.createTask(`Zone - ${task.source || task.type}`);
		return delegate.scheduleTask(target, task);
	}
	onInvokeTask(delegate, _currentZone, targetZone, task, applyThis, applyArgs) {
		let ret;
		if (task.consoleTask) ret = task.consoleTask.run(() => delegate.invokeTask(targetZone, task, applyThis, applyArgs));
		else ret = delegate.invokeTask(targetZone, task, applyThis, applyArgs);
		return ret;
	}
};
var isAngularZoneProperty = "isAngularZone";
var angularZoneInstanceIdProperty = "isAngularZone_ID";
var ngZoneInstanceId = 0;
var NgZone = class NgZone {
	hasPendingMacrotasks = false;
	hasPendingMicrotasks = false;
	isStable = true;
	onUnstable = new EventEmitter(false);
	onMicrotaskEmpty = new EventEmitter(false);
	onStable = new EventEmitter(false);
	onError = new EventEmitter(false);
	constructor(options) {
		const { enableLongStackTrace = false, shouldCoalesceEventChangeDetection = false, shouldCoalesceRunChangeDetection = false, scheduleInRootZone = false } = options;
		if (typeof Zone == "undefined") throw new RuntimeError(908, ngDevMode && `In this configuration Angular requires Zone.js`);
		Zone.assertZonePatched();
		const self = this;
		self._nesting = 0;
		self._outer = self._inner = Zone.current;
		if (ngDevMode) self._inner = self._inner.fork(new AsyncStackTaggingZoneSpec("Angular"));
		if (Zone["TaskTrackingZoneSpec"]) self._inner = self._inner.fork(new Zone["TaskTrackingZoneSpec"]());
		if (enableLongStackTrace && Zone["longStackTraceZoneSpec"]) self._inner = self._inner.fork(Zone["longStackTraceZoneSpec"]);
		self.shouldCoalesceEventChangeDetection = !shouldCoalesceRunChangeDetection && shouldCoalesceEventChangeDetection;
		self.shouldCoalesceRunChangeDetection = shouldCoalesceRunChangeDetection;
		self.callbackScheduled = false;
		self.scheduleInRootZone = scheduleInRootZone;
		forkInnerZoneWithAngularBehavior(self);
	}
	static isInAngularZone() {
		return typeof Zone !== "undefined" && Zone.current.get(isAngularZoneProperty) === true;
	}
	static assertInAngularZone() {
		if (!NgZone.isInAngularZone()) throw new RuntimeError(909, ngDevMode && "Expected to be in Angular Zone, but it is not!");
	}
	static assertNotInAngularZone() {
		if (NgZone.isInAngularZone()) throw new RuntimeError(909, ngDevMode && "Expected to not be in Angular Zone, but it is!");
	}
	run(fn, applyThis, applyArgs) {
		return this._inner.run(fn, applyThis, applyArgs);
	}
	runTask(fn, applyThis, applyArgs, name) {
		const zone = this._inner;
		const task = zone.scheduleEventTask("NgZoneEvent: " + name, fn, EMPTY_PAYLOAD, noop, noop);
		try {
			return zone.runTask(task, applyThis, applyArgs);
		} finally {
			zone.cancelTask(task);
		}
	}
	runGuarded(fn, applyThis, applyArgs) {
		return this._inner.runGuarded(fn, applyThis, applyArgs);
	}
	runOutsideAngular(fn) {
		return this._outer.run(fn);
	}
};
var EMPTY_PAYLOAD = {};
function checkStable(zone) {
	if (zone._nesting == 0 && !zone.hasPendingMicrotasks && !zone.isStable) try {
		zone._nesting++;
		zone.onMicrotaskEmpty.emit(null);
	} finally {
		zone._nesting--;
		if (!zone.hasPendingMicrotasks) try {
			zone.runOutsideAngular(() => zone.onStable.emit(null));
		} finally {
			zone.isStable = true;
		}
	}
}
function delayChangeDetectionForEvents(zone) {
	if (zone.isCheckStableRunning || zone.callbackScheduled) return;
	zone.callbackScheduled = true;
	function scheduleCheckStable() {
		scheduleCallbackWithRafRace(() => {
			zone.callbackScheduled = false;
			updateMicroTaskStatus(zone);
			zone.isCheckStableRunning = true;
			checkStable(zone);
			zone.isCheckStableRunning = false;
		});
	}
	if (zone.scheduleInRootZone) Zone.root.run(() => {
		scheduleCheckStable();
	});
	else zone._outer.run(() => {
		scheduleCheckStable();
	});
	updateMicroTaskStatus(zone);
}
function forkInnerZoneWithAngularBehavior(zone) {
	const delayChangeDetectionForEventsDelegate = () => {
		delayChangeDetectionForEvents(zone);
	};
	const instanceId = ngZoneInstanceId++;
	zone._inner = zone._inner.fork({
		name: "angular",
		properties: {
			[isAngularZoneProperty]: true,
			[angularZoneInstanceIdProperty]: instanceId,
			[angularZoneInstanceIdProperty + instanceId]: true
		},
		onInvokeTask: (delegate, current, target, task, applyThis, applyArgs) => {
			if (shouldBeIgnoredByZone(applyArgs)) return delegate.invokeTask(target, task, applyThis, applyArgs);
			try {
				onEnter(zone);
				return delegate.invokeTask(target, task, applyThis, applyArgs);
			} finally {
				if (zone.shouldCoalesceEventChangeDetection && task.type === "eventTask" || zone.shouldCoalesceRunChangeDetection) delayChangeDetectionForEventsDelegate();
				onLeave(zone);
			}
		},
		onInvoke: (delegate, current, target, callback, applyThis, applyArgs, source) => {
			try {
				onEnter(zone);
				return delegate.invoke(target, callback, applyThis, applyArgs, source);
			} finally {
				if (zone.shouldCoalesceRunChangeDetection && !zone.callbackScheduled && !isSchedulerTick(applyArgs)) delayChangeDetectionForEventsDelegate();
				onLeave(zone);
			}
		},
		onHasTask: (delegate, current, target, hasTaskState) => {
			delegate.hasTask(target, hasTaskState);
			if (current === target) {
				if (hasTaskState.change == "microTask") {
					zone._hasPendingMicrotasks = hasTaskState.microTask;
					updateMicroTaskStatus(zone);
					checkStable(zone);
				} else if (hasTaskState.change == "macroTask") zone.hasPendingMacrotasks = hasTaskState.macroTask;
			}
		},
		onHandleError: (delegate, current, target, error) => {
			delegate.handleError(target, error);
			zone.runOutsideAngular(() => zone.onError.emit(error));
			return false;
		}
	});
}
function updateMicroTaskStatus(zone) {
	if (zone._hasPendingMicrotasks || (zone.shouldCoalesceEventChangeDetection || zone.shouldCoalesceRunChangeDetection) && zone.callbackScheduled === true) zone.hasPendingMicrotasks = true;
	else zone.hasPendingMicrotasks = false;
}
function onEnter(zone) {
	zone._nesting++;
	if (zone.isStable) {
		zone.isStable = false;
		zone.onUnstable.emit(null);
	}
}
function onLeave(zone) {
	zone._nesting--;
	checkStable(zone);
}
var NoopNgZone = class {
	hasPendingMicrotasks = false;
	hasPendingMacrotasks = false;
	isStable = true;
	onUnstable = new EventEmitter();
	onMicrotaskEmpty = new EventEmitter();
	onStable = new EventEmitter();
	onError = new EventEmitter();
	run(fn, applyThis, applyArgs) {
		return fn.apply(applyThis, applyArgs);
	}
	runGuarded(fn, applyThis, applyArgs) {
		return fn.apply(applyThis, applyArgs);
	}
	runOutsideAngular(fn) {
		return fn();
	}
	runTask(fn, applyThis, applyArgs, name) {
		return fn.apply(applyThis, applyArgs);
	}
};
function shouldBeIgnoredByZone(applyArgs) {
	return hasApplyArgsData(applyArgs, "__ignore_ng_zone__");
}
function isSchedulerTick(applyArgs) {
	return hasApplyArgsData(applyArgs, "__scheduler_tick__");
}
function hasApplyArgsData(applyArgs, key) {
	if (!Array.isArray(applyArgs)) return false;
	if (applyArgs.length !== 1) return false;
	return applyArgs[0]?.data?.[key] === true;
}
var ErrorHandler = class {
	_console = console;
	handleError(error) {
		this._console.error("ERROR", error);
	}
};
var INTERNAL_APPLICATION_ERROR_HANDLER = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "internal error handler" : "", { factory: () => {
	const zone = inject(NgZone);
	const injector = inject(EnvironmentInjector);
	let userErrorHandler;
	return (e) => {
		zone.runOutsideAngular(() => {
			if (injector.destroyed && !userErrorHandler) setTimeout(() => {
				throw e;
			});
			else {
				userErrorHandler ??= injector.get(ErrorHandler);
				userErrorHandler.handleError(e);
			}
		});
	};
} });
var errorHandlerEnvironmentInitializer = {
	provide: ENVIRONMENT_INITIALIZER,
	useValue: () => {
		const handler = inject(ErrorHandler, { optional: true });
		if ((typeof ngDevMode === "undefined" || ngDevMode) && handler === null) throw new RuntimeError(402, "A required Injectable was not found in the dependency injection tree. If you are bootstrapping an NgModule, make sure that the `BrowserModule` is imported.");
	},
	multi: true
};
var globalErrorListeners = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "GlobalErrorListeners" : "", { factory: () => {
	const window = inject(DOCUMENT).defaultView;
	if (!window) return;
	const errorHandler = inject(INTERNAL_APPLICATION_ERROR_HANDLER);
	const rejectionListener = (e) => {
		errorHandler(e.reason);
		e.preventDefault();
	};
	const errorListener = (e) => {
		if (e.error) errorHandler(e.error);
		else errorHandler(new Error(ngDevMode ? `An ErrorEvent with no error occurred. See Error.cause for details: ${e.message}` : e.message, { cause: e }));
		e.preventDefault();
	};
	const setupEventListeners = () => {
		window.addEventListener("unhandledrejection", rejectionListener);
		window.addEventListener("error", errorListener);
	};
	if (typeof Zone !== "undefined") Zone.root.run(setupEventListeners);
	else setupEventListeners();
	inject(DestroyRef).onDestroy(() => {
		window.removeEventListener("error", errorListener);
		window.removeEventListener("unhandledrejection", rejectionListener);
	});
} });
function provideBrowserGlobalErrorListeners() {
	return makeEnvironmentProviders([provideEnvironmentInitializer(() => void inject(globalErrorListeners))]);
}
function ɵunwrapWritableSignal(value) {
	return null;
}
function signal(initialValue, options) {
	const [get, set, update] = createSignal(initialValue, options?.equal);
	const signalFn = get;
	const node = signalFn[SIGNAL];
	signalFn.set = set;
	signalFn.update = update;
	signalFn.asReadonly = signalAsReadonlyFn.bind(signalFn);
	if (typeof ngDevMode !== "undefined" && ngDevMode) {
		const debugName = options?.debugName;
		node.debugName = debugName;
		signalFn.toString = () => `[Signal${debugName ? " (" + debugName + ")" : ""}: ${signalFn()}]`;
	}
	return signalFn;
}
function signalAsReadonlyFn() {
	const node = this[SIGNAL];
	if (node.readonlyFn === void 0) {
		const readonlyFn = () => this();
		readonlyFn[SIGNAL] = node;
		node.readonlyFn = readonlyFn;
	}
	return node.readonlyFn;
}
var APP_ID = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "AppId" : "", { factory: () => DEFAULT_APP_ID });
var DEFAULT_APP_ID = "ng";
var validAppIdInitializer = {
	provide: ENVIRONMENT_INITIALIZER,
	multi: true,
	useValue: () => {
		const appId = inject(APP_ID);
		if (!/^[a-zA-Z0-9\-_]+$/.test(appId)) throw new RuntimeError(211, `APP_ID value "${appId}" is not alphanumeric. The APP_ID must be a string of alphanumeric characters. (a-zA-Z0-9), hyphens (-) and underscores (_) are allowed.`);
	}
};
var PLATFORM_INITIALIZER = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "Platform Initializer" : "");
var PLATFORM_ID = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "Platform ID" : "", {
	providedIn: "platform",
	factory: () => "unknown"
});
var ANIMATION_MODULE_TYPE = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "AnimationModuleType" : "");
var CSP_NONCE = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "CSP nonce" : "", { factory: () => {
	return inject(DOCUMENT).body?.querySelector("[ngCspNonce]")?.getAttribute("ngCspNonce") || null;
} });
var IMAGE_CONFIG_DEFAULTS = {
	breakpoints: [
		16,
		32,
		48,
		64,
		96,
		128,
		256,
		384,
		640,
		750,
		828,
		1080,
		1200,
		1920,
		2048,
		3840
	],
	placeholderResolution: 30,
	disableImageSizeWarning: false,
	disableImageLazyLoadWarning: false
};
var IMAGE_CONFIG = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "ImageConfig" : "", { factory: () => IMAGE_CONFIG_DEFAULTS });
function makeStateKey(key) {
	return key;
}
var TransferState = class TransferState {
	static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
		token: TransferState,
		providedIn: "root",
		factory: () => {
			const transferState = new TransferState();
			transferState.store = retrieveTransferredState(inject(DOCUMENT), inject(APP_ID));
			return transferState;
		}
	});
	store = {};
	onSerializeCallbacks = {};
	get(key, defaultValue) {
		return this.store[key] !== void 0 ? this.store[key] : defaultValue;
	}
	set(key, value) {
		this.store[key] = value;
	}
	remove(key) {
		delete this.store[key];
	}
	hasKey(key) {
		return this.store.hasOwnProperty(key);
	}
	get isEmpty() {
		return Object.keys(this.store).length === 0;
	}
	onSerialize(key, callback) {
		this.onSerializeCallbacks[key] = callback;
	}
	toJson() {
		for (const key in this.onSerializeCallbacks) if (this.onSerializeCallbacks.hasOwnProperty(key)) try {
			this.store[key] = this.onSerializeCallbacks[key]();
		} catch (e) {
			console.warn("Exception in onSerialize callback: ", e);
		}
		return JSON.stringify(this.store).replace(/</g, "\\u003C").replace(/\//g, "\\u002F");
	}
};
function retrieveTransferredState(doc, appId) {
	const script = doc.getElementById(appId + "-state");
	if (script?.tagName === "SCRIPT" && script.textContent) try {
		return JSON.parse(script.textContent);
	} catch (e) {
		console.warn("Exception while restoring TransferState for app " + appId, e);
	}
	return {};
}
function assertNotInReactiveContext(debugFn, extraContext) {
	if (getActiveConsumer() !== null) throw new RuntimeError(-602, ngDevMode && `${debugFn.name}() cannot be called from within a reactive context.${extraContext ? ` ${extraContext}` : ""}`);
}
var ViewContext = class {
	view;
	node;
	constructor(view, node) {
		this.view = view;
		this.node = node;
	}
	static __NG_ELEMENT_ID__ = injectViewContext;
};
function injectViewContext() {
	return new ViewContext(getLView(), getCurrentTNode());
}
var ChangeDetectionScheduler = class {};
var ZONELESS_ENABLED = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "Zoneless enabled" : "", { factory: () => true });
var PROVIDED_ZONELESS = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "Zoneless provided" : "", { factory: () => false });
var SCHEDULE_IN_ROOT_ZONE = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "run changes outside zone in root" : "");
var EffectScheduler = class EffectScheduler {
	static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
		token: EffectScheduler,
		providedIn: "root",
		factory: () => new ZoneAwareEffectScheduler()
	});
};
var ZoneAwareEffectScheduler = class {
	dirtyEffectCount = 0;
	queues = /* @__PURE__ */ new Map();
	add(handle) {
		this.enqueue(handle);
		this.schedule(handle);
	}
	schedule(handle) {
		if (!handle.dirty) return;
		this.dirtyEffectCount++;
	}
	remove(handle) {
		const zone = handle.zone;
		const queue = this.queues.get(zone);
		if (!queue.has(handle)) return;
		queue.delete(handle);
		if (handle.dirty) this.dirtyEffectCount--;
	}
	enqueue(handle) {
		const zone = handle.zone;
		if (!this.queues.has(zone)) this.queues.set(zone, /* @__PURE__ */ new Set());
		const queue = this.queues.get(zone);
		if (queue.has(handle)) return;
		queue.add(handle);
	}
	flush() {
		while (this.dirtyEffectCount > 0) {
			let ranOneEffect = false;
			for (const [zone, queue] of this.queues) if (zone === null) ranOneEffect ||= this.flushQueue(queue);
			else ranOneEffect ||= zone.run(() => this.flushQueue(queue));
			if (!ranOneEffect) this.dirtyEffectCount = 0;
		}
	}
	flushQueue(queue) {
		let ranOneEffect = false;
		for (const handle of queue) {
			if (!handle.dirty) continue;
			this.dirtyEffectCount--;
			ranOneEffect = true;
			handle.run();
		}
		return ranOneEffect;
	}
};
var EffectRefImpl = class {
	[SIGNAL];
	constructor(node) {
		this[SIGNAL] = node;
	}
	destroy() {
		this[SIGNAL].destroy();
	}
};
function effect(effectFn, options) {
	ngDevMode && assertNotInReactiveContext(effect, "Call `effect` outside of a reactive context. For example, schedule the effect inside the component constructor.");
	if (ngDevMode && !options?.injector) assertInInjectionContext(effect);
	if (ngDevMode && options?.allowSignalWrites !== void 0) console.warn(`The 'allowSignalWrites' flag is deprecated and no longer impacts effect() (writes are always allowed)`);
	const injector = options?.injector ?? inject(Injector);
	let destroyRef = options?.manualCleanup !== true ? injector.get(DestroyRef) : null;
	let node;
	const viewContext = injector.get(ViewContext, null, { optional: true });
	const notifier = injector.get(ChangeDetectionScheduler);
	if (viewContext !== null) {
		node = createViewEffect(viewContext.view, notifier, effectFn);
		if (destroyRef instanceof NodeInjectorDestroyRef && destroyRef._lView === viewContext.view) destroyRef = null;
	} else node = createRootEffect(effectFn, injector.get(EffectScheduler), notifier);
	node.injector = injector;
	if (destroyRef !== null) node.onDestroyFns = [destroyRef.onDestroy(() => node.destroy())];
	const effectRef = new EffectRefImpl(node);
	if (ngDevMode) {
		node.debugName = options?.debugName ?? "";
		const prevInjectorProfilerContext = setInjectorProfilerContext({
			injector,
			token: null
		});
		try {
			emitEffectCreatedEvent(effectRef);
		} finally {
			setInjectorProfilerContext(prevInjectorProfilerContext);
		}
	}
	return effectRef;
}
var EFFECT_NODE = /* @__PURE__ */ (() => ({
	...BASE_EFFECT_NODE,
	cleanupFns: void 0,
	zone: null,
	onDestroyFns: null,
	run() {
		if (ngDevMode && isInNotificationPhase()) throw new Error(`Schedulers cannot synchronously execute watches while scheduling.`);
		const prevRefreshingViews = setIsRefreshingViews(false);
		try {
			runEffect(this);
		} finally {
			setIsRefreshingViews(prevRefreshingViews);
		}
	},
	cleanup() {
		if (!this.cleanupFns?.length) return;
		const prevConsumer = setActiveConsumer(null);
		try {
			while (this.cleanupFns.length) this.cleanupFns.pop()();
		} finally {
			this.cleanupFns = [];
			setActiveConsumer(prevConsumer);
		}
	}
}))();
var ROOT_EFFECT_NODE = /* @__PURE__ */ (() => ({
	...EFFECT_NODE,
	consumerMarkedDirty() {
		this.scheduler.schedule(this);
		this.notifier.notify(12);
	},
	destroy() {
		consumerDestroy(this);
		if (this.onDestroyFns !== null) for (const fn of this.onDestroyFns) fn();
		this.cleanup();
		this.scheduler.remove(this);
	}
}))();
var VIEW_EFFECT_NODE = /* @__PURE__ */ (() => ({
	...EFFECT_NODE,
	consumerMarkedDirty() {
		this.view[2] |= 8192;
		markAncestorsForTraversal(this.view);
		this.notifier.notify(13);
	},
	destroy() {
		consumerDestroy(this);
		if (this.onDestroyFns !== null) for (const fn of this.onDestroyFns) fn();
		this.cleanup();
		this.view[23]?.delete(this);
	}
}))();
function createViewEffect(view, notifier, fn) {
	const node = Object.create(VIEW_EFFECT_NODE);
	node.view = view;
	node.zone = typeof Zone !== "undefined" ? Zone.current : null;
	node.notifier = notifier;
	node.fn = createEffectFn(node, fn);
	view[23] ??= /* @__PURE__ */ new Set();
	view[23].add(node);
	node.consumerMarkedDirty(node);
	return node;
}
function createRootEffect(fn, scheduler, notifier) {
	const node = Object.create(ROOT_EFFECT_NODE);
	node.fn = createEffectFn(node, fn);
	node.scheduler = scheduler;
	node.notifier = notifier;
	node.zone = typeof Zone !== "undefined" ? Zone.current : null;
	node.scheduler.add(node);
	node.notifier.notify(12);
	return node;
}
function createEffectFn(node, fn) {
	return () => {
		fn((cleanupFn) => (node.cleanupFns ??= []).push(cleanupFn));
	};
}
function isSignal(value) {
	return typeof value === "function" && value[SIGNAL] !== void 0;
}
function isWritableSignal(value) {
	return isSignal(value) && typeof value.set === "function";
}
var PendingTasks = class PendingTasks {
	internalPendingTasks = inject(PendingTasksInternal);
	scheduler = inject(ChangeDetectionScheduler);
	errorHandler = inject(INTERNAL_APPLICATION_ERROR_HANDLER);
	add() {
		const taskId = this.internalPendingTasks.add();
		return () => {
			if (!this.internalPendingTasks.has(taskId)) return;
			this.scheduler.notify(11);
			this.internalPendingTasks.remove(taskId);
		};
	}
	run(fn) {
		const removeTask = this.add();
		try {
			fn().catch(this.errorHandler).finally(removeTask);
		} catch (err) {
			this.errorHandler(err);
			removeTask();
		}
	}
	static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
		token: PendingTasks,
		providedIn: "root",
		factory: () => new PendingTasks()
	});
};
//#endregion
//#region node_modules/@angular/core/fesm2022/_resource-chunk.mjs
/**
* @license Angular v22.1.2
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var OutputEmitterRef = class {
	destroyed = false;
	listeners = null;
	errorHandler = inject(ErrorHandler, { optional: true });
	isEmitting = false;
	hasNullListeners = false;
	destroyRef = inject(DestroyRef);
	constructor() {
		this.destroyRef.onDestroy(() => {
			this.destroyed = true;
			this.listeners = null;
		});
	}
	subscribe(callback) {
		if (this.destroyed) throw new RuntimeError(953, ngDevMode && "Unexpected subscription to destroyed `OutputRef`. The owning directive/component is destroyed.");
		(this.listeners ??= []).push(callback);
		return { unsubscribe: () => {
			const index = this.listeners ? this.listeners.indexOf(callback) : -1;
			if (index > -1) if (this.isEmitting) {
				this.hasNullListeners = true;
				this.listeners[index] = null;
			} else this.listeners.splice(index, 1);
		} };
	}
	emit(value) {
		if (this.destroyed) {
			console.warn(formatRuntimeError(953, ngDevMode && "Unexpected emit for destroyed `OutputRef`. The owning directive/component is destroyed."));
			return;
		}
		if (this.listeners === null) return;
		this.isEmitting = true;
		const previousConsumer = setActiveConsumer(null);
		try {
			for (const listenerFn of this.listeners) try {
				if (listenerFn !== null) listenerFn(value);
			} catch (err) {
				this.errorHandler?.handleError(err);
			}
		} finally {
			if (this.hasNullListeners) {
				this.hasNullListeners = false;
				this.listeners && removeNullValues(this.listeners);
			}
			setActiveConsumer(previousConsumer);
			this.isEmitting = false;
		}
	}
};
function removeNullValues(arr) {
	let i = arr.length - 1;
	while (i > -1) {
		if (arr[i] === null) arr.splice(i, 1);
		i--;
	}
}
function getOutputDestroyRef(ref) {
	return ref.destroyRef;
}
var CACHE_ACTIVE = new InjectionToken(typeof ngDevMode !== "undefined" && ngDevMode ? "STATE_CACHE_ACTIVE" : "");
function computed(computation, options) {
	const getter = createComputed(computation, options?.equal);
	if (typeof ngDevMode !== "undefined" && ngDevMode) {
		const debugName = options?.debugName;
		getter[SIGNAL].debugName = debugName;
		getter.toString = () => `[Computed${debugName ? " (" + debugName + ")" : ""}: ${getter()}]`;
	}
	return getter;
}
function untracked(nonReactiveReadsFn) {
	return untracked$1(nonReactiveReadsFn);
}
var ResourceDependencyError = class extends Error {
	dependency;
	constructor(dependency) {
		super("Dependency error", { cause: dependency.error() });
		this.name = "ResourceDependencyError";
		this.dependency = dependency;
	}
};
var ResourceParamsStatus = class ResourceParamsStatus extends Error {
	_brand;
	constructor(msg) {
		super(msg);
	}
	static IDLE = new ResourceParamsStatus("IDLE");
	static LOADING = new ResourceParamsStatus("LOADING");
};
var identityFn = (v) => v;
function linkedSignal(optionsOrComputation, options) {
	if (typeof optionsOrComputation === "function") return upgradeLinkedSignalGetter(createLinkedSignal(optionsOrComputation, identityFn, options?.equal), options?.debugName, options?.set);
	else return upgradeLinkedSignalGetter(createLinkedSignal(optionsOrComputation.source, optionsOrComputation.computation, optionsOrComputation.equal), optionsOrComputation.debugName, optionsOrComputation.set);
}
function upgradeLinkedSignalGetter(getter, debugName, customSet) {
	if (typeof ngDevMode !== "undefined" && ngDevMode) {
		getter[SIGNAL].debugName = debugName;
		getter.toString = () => `[LinkedSignal${debugName ? " (" + debugName + ")" : ""}: ${getter()}]`;
	}
	const node = getter[SIGNAL];
	const upgradedGetter = getter;
	if (customSet !== void 0) {
		const rawSet = (newValue) => linkedSignalSetFn(node, newValue);
		upgradedGetter.set = (newValue) => customSet(newValue, rawSet);
		upgradedGetter.update = (updateFn) => customSet(updateFn(untracked(getter)), rawSet);
	} else {
		upgradedGetter.set = (newValue) => linkedSignalSetFn(node, newValue);
		upgradedGetter.update = (updateFn) => linkedSignalUpdateFn(node, updateFn);
	}
	upgradedGetter.asReadonly = signalAsReadonlyFn.bind(getter);
	return upgradedGetter;
}
function resource(options) {
	if (ngDevMode && !options?.injector) assertInInjectionContext(resource);
	const oldNameForParams = options.request;
	return new ResourceImpl(options.params ?? oldNameForParams ?? (() => null), getLoader(options), options.defaultValue, options.equal ? wrapEqualityFn(options.equal) : void 0, options.debugName, options.injector ?? inject(Injector), options.id);
}
var BaseWritableResource = class {
	value;
	isLoading;
	constructor(value, debugName) {
		this.value = value;
		this.value.set = this.set.bind(this);
		this.value.update = this.update.bind(this);
		this.value.asReadonly = signalAsReadonlyFn;
		this.isLoading = computed(() => this.status() === "loading" || this.status() === "reloading", ngDevMode ? createDebugNameObject(debugName, "isLoading") : void 0);
	}
	isError = computed(() => this.status() === "error");
	update(updateFn) {
		this.set(updateFn(untracked(this.value)));
	}
	isValueDefined = computed(() => {
		if (this.isError()) return false;
		return this.value() !== void 0;
	});
	_snapshot;
	get snapshot() {
		return this._snapshot ??= computed(() => {
			const status = this.status();
			if (status === "error") return {
				status: "error",
				error: this.error()
			};
			else return {
				status,
				value: this.value()
			};
		});
	}
	hasValue() {
		return this.isValueDefined();
	}
	asReadonly() {
		return this;
	}
};
var ResourceImpl = class extends BaseWritableResource {
	loaderFn;
	equal;
	debugName;
	transferCacheKey;
	pendingTasks;
	state;
	extRequest;
	effectRef;
	pendingController;
	resolvePendingTask = void 0;
	destroyed = false;
	unregisterOnDestroy;
	status;
	error;
	transferState;
	constructor(request, loaderFn, defaultValue, equal, debugName, injector, transferCacheKey, getInitialStream) {
		if (isInParamsFunction()) throw invalidResourceCreationInParams();
		super(computed(() => {
			const streamValue = this.state().stream?.();
			if (!streamValue) return defaultValue;
			if (this.state().status === "loading" && this.error()) return defaultValue;
			if (!isResolved(streamValue)) throw new ResourceValueError(this.error());
			return streamValue.value;
		}, {
			equal,
			...ngDevMode ? createDebugNameObject(debugName, "value") : void 0
		}), debugName);
		this.loaderFn = loaderFn;
		this.equal = equal;
		this.debugName = debugName;
		this.transferCacheKey = transferCacheKey;
		const cacheState = injector.get(CACHE_ACTIVE, void 0, { optional: true }) ?? { isActive: false };
		this.transferState = injector.get(TransferState, void 0, { optional: true }) ?? void 0;
		this.extRequest = linkedSignal(() => {
			try {
				setInParamsFunction(true);
				return {
					request: request(paramsContext),
					reload: 0
				};
			} catch (error) {
				rethrowFatalErrors(error);
				if (error === ResourceParamsStatus.IDLE) return {
					status: "idle",
					reload: 0
				};
				else if (error === ResourceParamsStatus.LOADING) return {
					status: "loading",
					reload: 0
				};
				return {
					error,
					reload: 0
				};
			} finally {
				setInParamsFunction(false);
			}
		}, ngDevMode ? createDebugNameObject(debugName, "extRequest") : void 0);
		this.state = linkedSignal({
			source: this.extRequest,
			computation: (extRequest, previous) => {
				let { request, status, error } = extRequest;
				let stream;
				if (error) {
					status = "resolved";
					stream = signal({ error: encapsulateResourceError(error) }, ngDevMode ? createDebugNameObject(this.debugName, "stream") : void 0);
				} else if (!status) if (!previous) {
					const transferState = this.transferState;
					const cacheKey = this.transferCacheKey;
					if (cacheState.isActive && cacheKey && transferState && request !== void 0) {
						if (transferState.hasKey(cacheKey)) stream = signal({ value: transferState.get(cacheKey, defaultValue) }, ngDevMode ? createDebugNameObject(this.debugName, "stream") : void 0);
					}
					if (!stream) stream = getInitialStream?.(extRequest.request);
					getInitialStream = void 0;
					status = request === void 0 ? "idle" : stream ? "resolved" : "loading";
				} else {
					status = request === void 0 ? "idle" : "loading";
					if (previous.value.extRequest.request === request) stream = previous.value.stream;
				}
				return {
					extRequest,
					status,
					previousStatus: previous ? projectStatusOfState(previous.value) : "idle",
					stream
				};
			},
			...ngDevMode ? createDebugNameObject(debugName, "state") : void 0
		});
		this.effectRef = effect(this.loadEffect.bind(this), {
			injector,
			manualCleanup: true,
			...ngDevMode ? createDebugNameObject(debugName, "loadEffect") : void 0
		});
		this.pendingTasks = injector.get(PendingTasks);
		this.unregisterOnDestroy = injector.get(DestroyRef).onDestroy(() => this.destroy());
		this.status = computed(() => projectStatusOfState(this.state()), ngDevMode ? createDebugNameObject(debugName, "status") : void 0);
		this.error = computed(() => {
			const stream = this.state().stream?.();
			return stream && !isResolved(stream) ? stream.error : void 0;
		}, ngDevMode ? createDebugNameObject(debugName, "error") : void 0);
	}
	set(value) {
		if (this.destroyed) return;
		const error = untracked(this.error);
		const state = untracked(this.state);
		if (!error) {
			const current = untracked(this.value);
			if (state.status === "local" && (this.equal ? this.equal(current, value) : current === value)) return;
		}
		this.state.set({
			extRequest: state.extRequest,
			status: "local",
			previousStatus: "local",
			stream: signal({ value }, ngDevMode ? createDebugNameObject(this.debugName, "stream") : void 0)
		});
		this.abortInProgressLoad();
	}
	reload() {
		const { status } = untracked(this.state);
		if (status === "idle" || status === "loading") return false;
		this.extRequest.update(({ request, reload }) => ({
			request,
			reload: reload + 1
		}));
		return true;
	}
	destroy() {
		this.destroyed = true;
		this.unregisterOnDestroy();
		this.effectRef.destroy();
		this.abortInProgressLoad();
		this.state.set({
			extRequest: {
				request: void 0,
				reload: 0
			},
			status: "idle",
			previousStatus: "idle",
			stream: void 0
		});
	}
	async loadEffect() {
		const extRequest = this.extRequest();
		const { status: currentStatus, previousStatus } = untracked(this.state);
		if (extRequest.request === void 0) return;
		else if (currentStatus !== "loading") return;
		this.abortInProgressLoad();
		let resolvePendingTask = this.resolvePendingTask = this.pendingTasks.add();
		const { signal: abortSignal } = this.pendingController = new AbortController();
		try {
			const stream = untracked(() => {
				return this.loaderFn({
					params: extRequest.request,
					abortSignal,
					previous: { status: previousStatus }
				});
			});
			const shouldDiscard = () => abortSignal.aborted || untracked(this.extRequest) !== extRequest;
			if (isSignal(stream)) {
				if (shouldDiscard()) return;
				this.state.set({
					extRequest,
					status: "resolved",
					previousStatus: "resolved",
					stream
				});
				untracked(stream);
			} else {
				const resolvedStream = await stream;
				if (shouldDiscard()) return;
				this.state.set({
					extRequest,
					status: "resolved",
					previousStatus: "resolved",
					stream: resolvedStream
				});
				resolvedStream && untracked(resolvedStream);
			}
		} catch (err) {
			rethrowFatalErrors(err);
			if (abortSignal.aborted || untracked(this.extRequest) !== extRequest) return;
			this.state.set({
				extRequest,
				status: "resolved",
				previousStatus: "error",
				stream: signal({ error: encapsulateResourceError(err) }, ngDevMode ? createDebugNameObject(this.debugName, "stream") : void 0)
			});
		} finally {
			resolvePendingTask?.();
			resolvePendingTask = void 0;
		}
	}
	abortInProgressLoad() {
		untracked(() => this.pendingController?.abort());
		this.pendingController = void 0;
		this.resolvePendingTask?.();
		this.resolvePendingTask = void 0;
	}
};
function wrapEqualityFn(equal) {
	return (a, b) => a === void 0 || b === void 0 ? a === b : equal(a, b);
}
function getLoader(options) {
	if (isStreamingResourceOptions(options)) return options.stream;
	return async (params) => {
		try {
			return signal({ value: await options.loader(params) }, ngDevMode ? createDebugNameObject(options.debugName, "stream") : void 0);
		} catch (err) {
			return signal({ error: encapsulateResourceError(err) }, ngDevMode ? createDebugNameObject(options.debugName, "stream") : void 0);
		}
	};
}
function isStreamingResourceOptions(options) {
	return !!options.stream;
}
function projectStatusOfState(state) {
	switch (state.status) {
		case "loading": return state.extRequest.reload === 0 ? "loading" : "reloading";
		case "resolved": return isResolved(state.stream()) ? "resolved" : "error";
		default: return state.status;
	}
}
function isResolved(state) {
	return state.error === void 0;
}
function createDebugNameObject(resourceDebugName, internalSignalDebugName) {
	return { debugName: `Resource${resourceDebugName ? "#" + resourceDebugName : ""}.${internalSignalDebugName}` };
}
function encapsulateResourceError(error) {
	if (isErrorLike(error)) return error;
	return new ResourceWrappedError(error);
}
function isErrorLike(error) {
	return error instanceof Error || typeof error === "object" && typeof error.name === "string" && typeof error.message === "string";
}
var ResourceValueError = class extends Error {
	constructor(error) {
		super(ngDevMode ? `Resource is currently in an error state (see Error.cause for details): ${error.message}` : error.message, { cause: error });
	}
};
var ResourceWrappedError = class extends Error {
	constructor(error) {
		super(ngDevMode ? `Resource returned an error that's not an Error instance: ${String(error)}. Check this error's .cause for the actual error.` : String(error), { cause: error });
	}
};
function chain(resource) {
	switch (resource.status()) {
		case "idle": throw ResourceParamsStatus.IDLE;
		case "error": throw new ResourceDependencyError(resource);
		case "loading":
		case "reloading": throw ResourceParamsStatus.LOADING;
	}
	return resource.value();
}
var paramsContext = { chain };
var inParamsFunction = false;
function isInParamsFunction() {
	return inParamsFunction;
}
function setInParamsFunction(value) {
	inParamsFunction = value;
}
function invalidResourceCreationInParams() {
	return new RuntimeError(992, ngDevMode && `Cannot create a resource inside the \`params\` of another resource`);
}
function rethrowFatalErrors(error) {
	if (error instanceof RuntimeError && error.code === 992) throw error;
}
//#endregion
export { NG_PROV_DEF as $, validAppIdInitializer as $i, getInjectorDef as $n, lastNodeWasCreated as $r, assertParentView as $t, ENVIRONMENT_INITIALIZER as A, signalSetFn as Aa, setCurrentQueryIndex as Ai, flatten as An, isDestroyed as Ar, assertFirstUpdatePass as At, INJECTOR_DEF_TYPES as B, signal as Bi, getConstant as Bn, isLContainer as Br, assertLContainer as Bt, CheckNoChangesMode as C, consumerDestroy as Ca, runInInjectionContext as Ci, emitInstanceCreatedByInjectorEvent as Cn, internalImportProvidersFrom as Cr, arraySplice as Ct, DestroyRef as D, producerAccessed as Da, setBindingIndex as Di, enterView as Dn, isContentQueryHost as Dr, assertElement as Dt, DOC_PAGE_BASE_URL as E, getActiveConsumer as Ea, scheduleCallbackWithRafRace as Ei, enterSkipHydrationBlock as En, isComponentHost as Er, assertDomNode as Et, ErrorHandler as F, setInjectorProfiler as Fi, getBindingRoot as Fn, isInCheckNoChangesMode as Fr, assertInInjectionContext as Ft, MATH_ML_NAMESPACE as G, stringify as Gi, getCurrentQueryIndex as Gn, isSignal as Gr, assertNotDefined as Gt, INTERNAL_APPLICATION_ERROR_HANDLER as H, store as Hi, getCurrentDirectiveDef as Hn, isProjectionTNode as Hr, assertLessThan as Ht, EventEmitter as I, setInjectorProfilerContext as Ii, getBindingsEnabled as In, isInI18nBlock as Ir, assertIndexInDeclRange as It, NG_ELEMENT_ID as J, throwProviderNotFoundError as Ji, getDirectiveDef as Jn, isTypeProvider as Jr, assertNotReactive as Jt, NG_COMP_DEF as K, stringifyForError as Ki, getCurrentTNode as Kn, isSkipHydrationRootTNode as Kr, assertNotEqual as Kt, IMAGE_CONFIG as L, setIsInCheckNoChangesMode as Li, getClosureSafeProperty as Ln, isInInjectionContext as Lr, assertIndexInExpandoRange as Lt, EffectRefImpl as M, setCurrentTNodeAsNotParent as Mi, forwardRef as Mn, isEnvironmentProviders as Mr, assertGreaterThan as Mt, EffectScheduler as N, setInI18nBlock as Ni, getAllSpecialProviders as Nn, isExhaustiveCheckNoChanges as Nr, assertGreaterThanOrEqual as Nt, EMPTY_ARRAY as O, setActiveConsumer as Oa, setBindingRootForHostBindings as Oi, errorHandlerEnvironmentInitializer as On, isCreationMode as Or, assertEqual as Ot, EnvironmentInjector as P, setInjectImplementation as Pi, getBindingIndex as Pn, isForwardRef as Pr, assertHasParent as Pt, NG_PIPE_DEF as Q, updateAncestorTraversalFlagsOnAttach as Qi, getInjectableDef as Qn, keyValueArraySet as Qr, assertOneOf as Qt, IMAGE_CONFIG_DEFAULTS as R, setIsRefreshingViews as Ri, getComponentDef as Rn, isInSkipHydrationBlock as Rr, assertIndexInRange as Rt, ChangeDetectionScheduler as S, consumerBeforeComputation as Sa, retrieveTransferredState as Si, emitInjectorToCreateInstanceEvent as Sn, injectRootLimpMode as Sr, arrayInsert2 as St, DOCUMENT as T, createComputed as Ta, scheduleCallbackWithMicrotask as Ti, enterDI as Tn, isComponentDef as Tr, assertDirectiveDef as Tt, InjectionToken as U, storeCleanupWithContext as Ui, getCurrentDirectiveIndex as Un, isRefreshingViews as Ur, assertNgModuleType as Ut, INJECTOR_SCOPE as V, signalAsReadonlyFn as Vi, getContextLView as Vn, isLView as Vr, assertLView as Vt, Injector as W, storeLViewOnDestroy as Wi, getCurrentParentTNode as Wn, isRootView as Wr, assertNodeInjector as Wt, NG_INJ_DEF as X, unwrapLView as Xi, getElementDepthCount as Xn, keyValueArrayGet as Xr, assertNumber as Xt, NG_FACTORY_DEF as Y, truncateMiddle as Yi, getDirectiveDefOrThrow as Yn, isWritableSignal as Yr, assertNotSame as Yt, NG_MOD_DEF as Z, unwrapRNode as Zi, getFactoryDef as Zn, keyValueArrayIndexOf as Zr, assertNumberInRange as Zt, untracked as _, setCurrentInjector as _a, removeLViewOnDestroy as _i, decreaseElementDepthCount as _n, importProvidersFrom as _r, ZONELESS_ENABLED as _t, ResourceParamsStatus as a, ɵunwrapWritableSignal as aa, makeStateKey as ai, assertTNodeCreationIndex as an, getNativeByTNodeOrNull as ar, PROVIDED_ZONELESS as at, CONTAINER_HEADER_OFFSET as b, SIGNAL_NODE as ba, resetPreOrderHookFlags as bi, emitAfterRenderEffectPhaseCreatedEvent as bn, initNgDevMode as br, angularZoneInstanceIdProperty as bt, computed as c, ɵɵdisableBindings as ca, newArray as ci, attachInjectFlag as cn, getNullInjector as cr, R3Injector as ct, invalidResourceCreationInParams as d, ɵɵinvalidFactoryDep as da, promiseWithResolvers as di, convertToBitFlags as dn, getPipeDef as dr, SecurityContext as dt, viewAttachedToChangeDetector as ea, leaveDI as ei, assertProjectionSlots as en, getLView as er, NgZone as et, isInParamsFunction as f, ɵɵnamespaceHTML as fa, provideBrowserGlobalErrorListeners as fi, createInjector as fn, getSelectedIndex as fr, TransferState as ft, setInParamsFunction as g, ɵɵrestoreView as ga, removeFromArray as gi, debugStringifyTypeForError as gn, hasI18n as gr, XSS_SECURITY_URL as gt, rethrowFatalErrors as h, ɵɵresetView as ha, registerSpecialProvider as hi, cyclicDependencyErrorWithDetails as hn, getTView as hr, ViewContext as ht, ResourceImpl as i, wasLastNodeCreated as ia, makeEnvironmentProviders as ii, assertTNode as in, getNativeByTNode as ir, PLATFORM_INITIALIZER as it, ERROR_DETAILS_PAGE_BASE_URL as j, setCurrentTNode as ji, formatRuntimeError as jn, isDirectiveHost as jr, assertFunction as jt, EMPTY_OBJ as k, setThrowInvalidWriteToSignalError as ka, setCurrentDirectiveIndex as ki, fillProperties as kn, isCurrentTNodeParent as kr, assertFirstCreatePass as kt, encapsulateResourceError as l, ɵɵenableBindings as la, nextBindingIndex as li, checkSecurityContext as ln, getOrCreateLViewCleanup as lr, RuntimeError as lt, resource as m, ɵɵnamespaceSVG as ma, providerToFactory as mi, cyclicDependencyError as mn, getTNode as mr, Version as mt, OutputEmitterRef as n, walkProviderTree as na, leaveView as ni, assertString as nn, getNamespace as nr, NullInjector as nt, ResourceValueError as o, ɵɵdefineInjectable as oa, markAncestorsForTraversal as oi, assertTNodeForLView as on, getNgModuleDef as or, PendingTasks as ot, linkedSignal as p, ɵɵnamespaceMathML as pa, provideEnvironmentInitializer as pi, createInjectorWithoutInjectorInstances as pn, getSelectedTNode as pr, VERSION as pt, NG_DIR_DEF as q, throwError as qi, getCurrentTNodePlaceholderOk as qn, isStandalone as qr, assertNotInReactiveContext as qt, ResourceDependencyError as r, walkUpViews as ra, load as ri, assertTIcu as rn, getNativeByIndex as rr, PLATFORM_ID as rt, chain as s, ɵɵdefineInjector as sa, markViewForRefresh as si, assertTNodeForTView as sn, getNgModuleDefOrThrow as sr, PendingTasksInternal as st, CACHE_ACTIVE as t, viewAttachedToContainer as ta, leaveSkipHydrationBlock as ti, assertSame as tn, getLViewParent as tr, NoopNgZone as tt, getOutputDestroyRef as u, ɵɵinject as ua, nextContextImpl as ui, concatStringsWithSpace as un, getOrCreateTViewCleanup as ur, SCHEDULE_IN_ROOT_ZONE as ut, ANIMATION_MODULE_TYPE as v, REACTIVE_NODE as va, renderStringify as vi, deepForEach as vn, increaseElementDepthCount as vr, _global as vt, DEBUG_TASK_TRACKER as w, consumerPollProducersForChange as wa, runInInjectorProfilerContext as wi, emitProviderConfiguredEvent as wn, isClassProvider as wr, assertDefined as wt, CSP_NONCE as x, consumerAfterComputation as xa, resolveForwardRef as xi, emitInjectEvent as xn, inject as xr, arrayEquals as xt, APP_ID as y, SIGNAL as ya, requiresRefreshOrTraversal as yi, effect as yn, incrementBindingIndex as yr, addToArray as yt, INJECTOR$1 as z, setSelectedIndex as zi, getComponentLViewByIndex as zn, isInjectable as zr, assertInjectImplementationNotEqual as zt };
