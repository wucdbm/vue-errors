export function scrollToElement(element: Element): void {
    const scroll = getElementOffset(element).top

    window.scrollTo({
        top: scroll - 150,
        left: 0,
        behavior: 'smooth',
    })
}

export function scrollToFirstErrorElement(
    container: HTMLElement,
    cssSelector: string = '.has-error',
): boolean {
    const element = container.querySelectorAll(cssSelector)[0]

    if (!element) {
        return false
    }

    scrollToElement(element)

    return true
}

export function getElementOffset(element: Element): {
    top: number
    left: number
} {
    const rect = element.getBoundingClientRect()
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft
    const scrollTop = window.scrollY || document.documentElement.scrollTop

    return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
}
