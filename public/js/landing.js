document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Authorization Check
    const authButtons = document.getElementById('auth-buttons');
    const token = localStorage.getItem('token');
    
    if (token) {
        authButtons.innerHTML = `
            <a href="/dashboard.html" class="btn btn-primary btn-pill">В панель</a>
            <a href="#" id="logout-btn" class="nav-link">Выйти</a>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.reload();
        });
    }

    // 2. FAQ Accordion
    const accordionHeaders = document.querySelectorAll('.acc-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            
            header.classList.toggle('active');
            
            if (header.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = null;
            }
            
            accordionHeaders.forEach(otherHeader => {
                if (otherHeader !== header && otherHeader.classList.contains('active')) {
                    otherHeader.classList.remove('active');
                    otherHeader.nextElementSibling.style.maxHeight = null;
                }
            });
        });
    });

    // 3. Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = 'Отправка...';
            btn.style.opacity = '0.7';
            
            setTimeout(() => {
                btn.innerText = 'Успешно отправлено!';
                btn.style.background = '#10b981';
                btn.style.opacity = '1';
                contactForm.reset();
                
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = '';
                }, 3000);
            }, 1000);
        });
    }

    // 4. Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
