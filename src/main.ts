import utils from '@stepanenko3/js-utils';

export interface ToastOptions {
    title: string,
    content: string,
    width: number,
    margin: number,
    elementsStyle: string,
    backgroundColor: string,
    duration: number,
    unfocusduration: number,
    position: string,
    showclose: boolean,
    progressbar: string,
    opacity: string | number,
    preventDuplicate: boolean,
    onclose: Function,
    class: any,
}

export interface ToastElement extends HTMLElement {
    closeButtonElement?: HTMLElement,
    progressBarWrapper?: HTMLElement,
    progressbarElement?: HTMLElement,
    progressbarType?: string,
    removeTimeout?: number | any,
    listeners?: any[],
}

export default class Toast {
    private static options: ToastOptions = {
        title: '',
        content: '',
        width: 350,
        margin: 10,
        elementsStyle: 'dark',
        backgroundColor: '#fff',
        duration: 5000,
        unfocusduration: 1000,
        position: 'top-right',
        showclose: false,
        progressbar: 'hidden',
        opacity: '1',
        preventDuplicate: true,
        onclose: () => { },
        class: {
            title: 'vtoast__title',
        },
    };

    private static toasts: any = {
        'top-left': [],
        'top-center': [],
        'top-right': [],
        // 'middle-left': [],
        // 'middle-center': [],
        // 'middle-right': [],
        'bottom-left': [],
        'bottom-center': [],
        'bottom-right': [],
    };

    public static show(args: Partial<ToastOptions>) {
        const options = utils.object.extend(Toast.options, args);

        try {
            Toast._show(options);
        } catch (exception) {
            console.log(exception);
            throw exception;
        }
    }

    private static _findDuplicates(options: ToastOptions) {
        const currentContent = options.content.toString()
            .replaceAll(/\s/g, '')
            .replaceAll(/\\"/g, '"')
            .replaceAll('=""', '');

        return utils.dom.nodeArray(`.vtoast--${options.position} .vtoast__content`)

            .filter((n: HTMLElement) => n.innerHTML.toString()
                .replaceAll(/\s/g, '')
                .replaceAll(/\\"/g, '"')
                .replaceAll('=""', '') === currentContent)

            .map((n: HTMLElement) => utils.dom.getClosest(n, '.vtoast'));
    }

    private static _show(options: ToastOptions) {
        if (options.preventDuplicate) {
            const duplicates = Toast._findDuplicates(options);

            if (duplicates.length) {
                duplicates.map((d: HTMLElement | null) => Toast._resetTimer(d as ToastElement, options));

                return;
            }
        }

        const toast = Toast._createToastElement(options);

        document.body.append(toast);

        const position = Toast.getPosition(options);

        if (position[0] === 'top') {
            toast.style.top = '0';
        } else if (position[0] === 'bottom') {
            toast.style.bottom = '0';
        } else {
            throw new Error('vtoast: error, unknown vertical position attribute ' + position[0] + '.');
        }

        if (position[1] === 'left') {
            toast.style.left = '0';
        } else if (position[1] === 'right') {
            toast.style.right = '0';
        } else if (position[1] === 'center') {
            toast.style.left = 'calc(50vw - (' + options.width + 'px / 2) - ' + options.margin + 'px)';
        } else {
            throw new Error('vtoast: error, unknown horizontal position attribute ' + position[1] + '.');
        }

        toast.style.width = options.width + 'px';
        toast.style.margin = options.margin + 'px';

        toast.style.setProperty('--vtoast-bg', options.backgroundColor || '');
        toast.style.opacity = '' + options.opacity;

        if (options.duration) {
            Toast._remove(toast, options.duration, options);

            toast.listeners?.push(utils.event.listen(toast, 'mouseenter', function () {
                Toast._cancelRemove(toast);

                if (toast.progressbarType !== 'hidden' && toast.progressbarElement) {
                    toast.progressbarElement.style.transition = 'none';
                    toast.progressbarElement.style.width = '0';
                }
            }));
        }

        if (options.unfocusduration) {
            toast.listeners?.push(utils.event.listen(toast, 'mouseleave', function () {
                if (toast.progressbarType !== 'hidden') {
                    setTimeout(() => {
                        if (toast.progressbarElement && options.unfocusduration) {
                            toast.progressbarElement.style.transition = `width ${options.unfocusduration / 1000}s linear`;
                            toast.progressbarElement.style.width = '100%';
                        }
                    });
                }

                Toast._remove(toast, (options.unfocusduration || 0), options);
            }));
        }

        toast.listeners?.push(utils.event.listen('[close-button]', 'click', (e: Event) => {
            const el = utils.dom.getClosest(e.target as HTMLElement, '[close-button]');

            const onclose = el?.getAttribute('onclose');

            if (onclose) {
                utils.helpers.safeEval(onclose);
            }

            Toast._remove(toast, 0, options);
        }, {
            parent: toast,
            once: true,
        }));

        if (toast.progressbarType !== 'hidden' && options.duration) {
            window.requestAnimationFrame(function () {
                if (toast.progressbarElement && options.duration) {
                    toast.progressbarElement.style.transition = `width ${options.duration / 1000}s linear`;
                    toast.progressbarElement.style.width = '100%';
                }
            });
        }

        Toast.toasts[position.join('-')].push(toast);

        Toast._movingToasts(options);

        window.requestAnimationFrame(() => toast.classList.remove('vtoast--in'));
    }

    private static _resetTimer(toast: ToastElement, options: ToastOptions) {
        Toast._cancelRemove(toast);

        if (toast.progressbarType !== 'hidden' && toast.progressbarElement) {
            toast.progressbarElement.style.transition = 'none';
            toast.progressbarElement.style.width = '0';
        }

        if (options.duration) {
            window.requestAnimationFrame(function () {
                if (toast.progressbarType !== 'hidden' && toast.progressbarElement && options.duration) {
                    toast.progressbarElement.style.transition = `width ${options.duration / 1000}s linear`;
                    toast.progressbarElement.style.width = '100%';
                }

                Toast._remove(toast, options.duration || 0, options);
            });
        }
    }

    private static _createToastElement(options: ToastOptions): ToastElement {
        const toastContainer: ToastElement = document.createElement('div');
        const contentContainer = document.createElement('div');

        if (options.showclose) {
            const closeButtonElement = document.createElement('i');
            closeButtonElement.setAttribute('close-button', ' ');
            closeButtonElement.classList.add('vtoast__close');

            toastContainer.closeButtonElement = closeButtonElement;
        }

        if (options.progressbar !== 'hidden') {
            const progressBarWrapper = document.createElement('div');
            progressBarWrapper.classList.add('progressbar', 'progressbar--sm');

            const progressBarElement = document.createElement('div');
            progressBarElement.classList.add('progressbar__line');

            progressBarWrapper.append(progressBarElement);

            toastContainer.progressBarWrapper = progressBarWrapper;
            toastContainer.progressbarElement = progressBarElement;
            toastContainer.progressbarType = options.progressbar;
        }

        toastContainer.classList.add(
            'vtoast',
            `vtoast--${options.elementsStyle}`,
            `vtoast--${options.position}`,
            'vtoast--in',
        );

        contentContainer.classList.add('vtoast__content');

        if (options.showclose && toastContainer.closeButtonElement) {
            toastContainer.append(toastContainer.closeButtonElement);
        }

        if (options.progressbar === 'top' && toastContainer.progressBarWrapper) {
            toastContainer.append(toastContainer.progressBarWrapper);
        }

        if (options.title) {
            const titleContainer = document.createElement('span');
            titleContainer.classList.add(...options.class.title.trim().split(' '));
            titleContainer.innerHTML = options.title;

            contentContainer.append(titleContainer);
        }

        contentContainer.innerHTML += options.content;

        toastContainer.append(contentContainer);

        if (options.progressbar === 'bottom' && toastContainer.progressBarWrapper) {
            toastContainer.append(toastContainer.progressBarWrapper);
        }

        toastContainer.listeners = [];

        return toastContainer;
    }

    private static _movingToasts(options: ToastOptions) {
        const position = Toast.getPosition(options);

        const toasts = Toast.toasts[position.join('-')]
            .slice().reverse();

        let offset = 0;

        for (const toastEl of toasts) {
            const currentOffset = toastEl.offsetHeight + options.margin;
            const direction = position[0] === 'top' ? 1 : -1;

            toastEl.style.transform = `translate3d(0, ${offset * direction}px, 0)`;

            offset += currentOffset;
        }
    }

    private static getPosition(options: ToastOptions): string[] {
        const position = options.position?.split('-');
        const vPosition: string = position && position[0] ? position[0] : 'bottom';
        const hPosition: string = position && position[1] ? position[1] : 'right';

        return [vPosition, hPosition];
    }

    private static _remove(toast: ToastElement, delay: number, options: ToastOptions) {
        toast.removeTimeout = setTimeout(function () {
            toast.classList.add('vtoast--out');

            if (options.onclose) {
                options.onclose();
            }

            setTimeout(function () {
                toast.listeners?.map((e) => e.unsubscribe());
                toast.remove();

                const position = Toast.getPosition(options);

                utils.array.removeValue(Toast.toasts[position.join('-')], toast);

                window.requestAnimationFrame(() => Toast._movingToasts(options));
            }, 500);
        }, delay);
    }

    private static _cancelRemove(toast: ToastElement) {
        clearTimeout(toast.removeTimeout);
    }
}
