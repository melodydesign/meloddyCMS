document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const burgerBtn = document.getElementById('burgerBtn');
    const mainNav = document.getElementById('mainNav');
    const body = document.body;
    const navLinks = document.querySelectorAll('.nav-link');

    if (burgerBtn && mainNav) {
        const toggleMenu = () => {
            burgerBtn.classList.toggle('active');
            mainNav.classList.toggle('active');
            body.classList.toggle('mobile-nav-open');
        };

        burgerBtn.addEventListener('click', toggleMenu);

        const mobileCloseBtn = document.getElementById('mobileCloseBtn');
        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', toggleMenu);
        }

        // Close menu on link click
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                mainNav.classList.remove('active');
                body.classList.remove('mobile-nav-open');
            });
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-btn');
        
        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Optional: Close all other accordions
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');
                const answer = item.querySelector('.faq-answer');
                answer.style.maxHeight = answer.scrollHeight + 40 + "px"; // 40px for padding
            }
        });
    });

    // Initialize the first FAQ item to be open if it has 'active' class
    const activeFaq = document.querySelector('.faq-item.active .faq-answer');
    if (activeFaq) {
        activeFaq.style.maxHeight = activeFaq.scrollHeight + 40 + "px";
    }

    // Intersection Observer for scroll animations
    const animatedElements = document.querySelectorAll('.hero-content, .why-card, .app-feature-item, .pricing-card, .review-card, .faq-item, .stat-item, .app-image');
    
    animatedElements.forEach((el, index) => {
        el.classList.add('fade-in-up');
        // Add slight delay to siblings to create staggered effect
        el.style.transitionDelay = `${(index % 3) * 0.15}s`;
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        observer.observe(el);
    });
});
