import sys
with open('public/js/dashboard_v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

search = """                            const res = await fetch(`/api/clients/${client.id}/delete`, {
                                method: 'POST',
            const uniqueSites = [];"""

replace = """                            const res = await fetch(`/api/clients/${client.id}/delete`, {
                                method: 'POST',
                                headers: {
                                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                                }
                            });
                            const data = await res.json();
                            if (res.ok) {
                                if (typeof showToast === 'function') showToast(data.message || 'Клиент успешно перенесен в корзину!');
                                loadSites();
                            } else {
                                alert(data.error || 'Ошибка при удалении клиента');
                            }
                        } catch (err) {
                            alert('Не удалось связаться с сервером');
                        }
                    }
                });
                
                tabsContainer.appendChild(tab);
            });
            
            container.appendChild(tabsContainer);
            container.appendChild(contentContainer);
            
            // Render first client's sites by default
            if (data.clients.length > 0) {
                renderClientSites(data.clients[0].sites, contentContainer);
            }
            
        } else {
            // Client view: just list sites
            const clientSites = data.sites || data;
            if (!clientSites || clientSites.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет активных проектов</div>';
                return;
            }
            container.style.display = 'grid';
            container.style.gridTemplateColumns = '1fr 1fr';
            renderClientSites(clientSites, container);
        }

        // Populate Activity Site Filter
        const siteFilterList = document.getElementById('activitySiteFilterList');
        if (siteFilterList) {
            // Collect all unique sites
            let allSitesArr = [];
            if (isAdmin || data.isDeveloper) {
                if (data.allSites) allSitesArr = [...data.allSites];
                else if (data.clients) {
                    data.clients.forEach(c => allSitesArr.push(...(c.sites || [])));
                }
                if (data.ownSites) allSitesArr.push(...data.ownSites);
            } else {
                allSitesArr = data.sites || data || [];
            }
            
            const uniqueSites = [];"""

new_content = content.replace(search, replace)
with open('public/js/dashboard_v2.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
