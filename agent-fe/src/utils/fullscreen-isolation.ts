type BackgroundElementState = {
  ariaHidden: string | null;
  element: HTMLElement;
  inert: boolean;
};

const isolateBackgroundElements = (foregroundElement: HTMLElement) => {
  const backgroundElements: BackgroundElementState[] = [];
  let currentForegroundElement: HTMLElement | undefined = foregroundElement;

  while (currentForegroundElement) {
    const parentElement: HTMLElement | null = currentForegroundElement.parentElement;

    if (!parentElement) {
      break;
    }

    Array.from(parentElement.children).forEach((element) => {
      if (element !== currentForegroundElement && element instanceof HTMLElement) {
        backgroundElements.push({
          ariaHidden: element.getAttribute('aria-hidden'),
          element,
          inert: element.inert
        });
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
      }
    });
    currentForegroundElement = parentElement;
  }

  return backgroundElements;
};

const restoreBackgroundElements = (backgroundElements: BackgroundElementState[]) => {
  backgroundElements.forEach(({ ariaHidden, element, inert }) => {
    element.inert = inert;

    if (ariaHidden === null) {
      element.removeAttribute('aria-hidden');
    } else {
      element.setAttribute('aria-hidden', ariaHidden);
    }
  });
};

export const isolateFullscreenElement = (foregroundElement: HTMLElement) => {
  const initialOverflow = document.documentElement.style.overflow;
  const backgroundElements = isolateBackgroundElements(foregroundElement);

  document.documentElement.style.overflow = 'hidden';

  return () => {
    document.documentElement.style.overflow = initialOverflow;
    restoreBackgroundElements(backgroundElements);
  };
};
