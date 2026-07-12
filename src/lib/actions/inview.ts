type InviewParams = {
	rootMargin?: string;
	once?: boolean;
	callback: (inView: boolean) => void;
};

export function inview(node: HTMLElement, params: InviewParams) {
	let current = params;

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry?.isIntersecting) {
				current.callback(true);
				if (current.once !== false) observer.unobserve(node);
			} else if (current.once === false) {
				current.callback(false);
			}
		},
		{ rootMargin: current.rootMargin ?? "0px" }
	);

	observer.observe(node);

	return {
		update(newParams: InviewParams) {
			current = newParams;
		},
		destroy() {
			observer.disconnect();
		}
	};
}
