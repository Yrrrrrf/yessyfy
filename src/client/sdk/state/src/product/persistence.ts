export interface PendingPhoto {
	id: string;
	owner: string;
	order_id: string;
	purpose?: "verification";
	document_kind?: string;
	phase: "diagnostic_before" | "work_progress" | "proof_finished";
	file: Blob;
	name: string;
	mime: string;
	source: "camera" | "file";
	captured_at?: string;
	coordinates?: { lat: number; lng: number };
	stage:
		| "queued"
		| "ticket"
		| "uploading"
		| "confirming"
		| "attaching"
		| "failed";
	ticket_id?: string;
	asset_id?: string;
	error?: string;
	renew_key?: string;
	begin_key: string;
	complete_key: string;
	attach_key: string;
	attach_revision?: number;
}
export interface PhotoPersistence {
	list(owner: string): Promise<PendingPhoto[]>;
	put(item: PendingPhoto): Promise<void>;
	remove(id: string): Promise<void>;
	close(): void;
}
export function photoPersistence(namespace: string): PhotoPersistence {
	let db: IDBDatabase | null = null;
	async function open() {
		if (db) return db;
		if (typeof indexedDB === "undefined")
			throw new Error("Persistent photo storage is unavailable");
		db = await new Promise<IDBDatabase>((resolve, reject) => {
			const r = indexedDB.open(`yessyfy:${namespace}:photos`, 1);
			r.onupgradeneeded = () =>
				r.result.createObjectStore("photos", { keyPath: "id" });
			r.onsuccess = () => resolve(r.result);
			r.onerror = () => reject(r.error);
		});
		return db;
	}
	async function run<T>(
		mode: IDBTransactionMode,
		action: (store: IDBObjectStore) => IDBRequest<T>,
	) {
		const d = await open();
		return await new Promise<T>((resolve, reject) => {
			const tx = d.transaction("photos", mode),
				r = action(tx.objectStore("photos"));
			let value: T;
			r.onsuccess = () => {
				value = r.result;
			};
			tx.oncomplete = () => resolve(value);
			tx.onerror = () => reject(tx.error);
			tx.onabort = () =>
				reject(tx.error ?? new Error("Photo persistence was interrupted"));
		});
	}
	return {
		async list(owner) {
			return (await run<PendingPhoto[]>("readonly", (s) => s.getAll())).filter(
				(p) => p.owner === owner,
			);
		},
		async put(item) {
			await run("readwrite", (s) => s.put(item));
		},
		async remove(id) {
			await run("readwrite", (s) => s.delete(id));
		},
		close() {
			db?.close();
			db = null;
		},
	};
}
export interface KeyStorage {
	get(key: string): string | null;
	set(key: string, value: string): void;
	remove(key: string): void;
}
export function browserStorage(
	kind: "session" | "local" = "session",
): KeyStorage {
	return {
		get(k) {
			return typeof window === "undefined"
				? null
				: (kind === "session" ? sessionStorage : localStorage).getItem(k);
		},
		set(k, v) {
			(kind === "session" ? sessionStorage : localStorage).setItem(k, v);
		},
		remove(k) {
			(kind === "session" ? sessionStorage : localStorage).removeItem(k);
		},
	};
}
