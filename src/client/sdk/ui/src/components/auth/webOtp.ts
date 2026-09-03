export async function listenForWebOtp(
	signal?: AbortSignal,
): Promise<string | null> {
	if (typeof window === "undefined" || !("credentials" in navigator)) {
		return null;
	}
	try {
		const credentialsContainer = navigator.credentials as unknown as {
			get(options: {
				otp: { transport: string[] };
				signal?: AbortSignal;
			}): Promise<{ code: string } | null>;
		};
		const otpObj = await credentialsContainer.get({
			otp: { transport: ["sms"] },
			signal,
		});
		return otpObj?.code || null;
	} catch {
		return null;
	}
}
