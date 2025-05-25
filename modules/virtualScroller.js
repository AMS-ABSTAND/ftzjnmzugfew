// ===== Module: virtualScroller.js =====
export class VirtualScroller {
    constructor(container, itemHeight, renderFunction) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderFunction = renderFunction;
        this.items = [];
        this.visibleItems = Math.ceil(window.innerHeight / itemHeight) + 5;
        this.scrollTop = 0;
        this.totalHeight = 0;
        
        this.setupContainer();
        this.setupScrollListener();
    }
    
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.height = '100%';
        this.container.style.overflow = 'auto';
    }
    
    setupScrollListener() {
        let scrollTimeout;
        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.render();
            }, 10);
        });
    }
    
    setItems(items) {
        this.items = items;
        this.totalHeight = items.length * this.itemHeight;
        this.render();
    }
    
    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + this.visibleItems,
            this.items.length
        );
        
        this.container.innerHTML = '';
        
        // Create spacer for items above
        if (startIndex > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = `${startIndex * this.itemHeight}px`;
            this.container.appendChild(spacer);
        }
        
        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
            const element = this.renderFunction(this.items[i]);
            this.container.appendChild(element);
        }
        
        // Create spacer for items below
        if (endIndex < this.items.length) {
            const spacer = document.createElement('div');
            spacer.style.height = `${(this.items.length - endIndex) * this.itemHeight}px`;
            this.container.appendChild(spacer);
        }
    }
}