import { getContext } from "svelte";
import type { Runtime } from "../../../state/src/product/runtime.svelte.ts";
export const RUNTIME = Symbol("yessyfy-runtime");
export function getRuntime(): Runtime {
	const r = getContext<Runtime>(RUNTIME);
	if (!r) throw new Error("Yessyfy runtime provider missing");
	return r;
}
