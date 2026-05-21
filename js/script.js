// === CONFIGURAÇÃO DO SUPABASE (COLE SUAS CHAVES AQUI) ===
        const SUPABASE_URL = 'https://kumpbuzzpocupglrhmqq.supabase.co'; 
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bXBidXp6cG9jdXBnbHJobXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDk3NjcsImV4cCI6MjA5NDg4NTc2N30.MSeQzvx9YPqsp_VQRd7pw0kySvpVMBVkHuLyaYjY35g'; 

        // Cabeçalhos exigidos pela API do Supabase
        const supabaseHeaders = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation' // Pede para a API retornar o resultado após insert/delete
        };

        let currentUser = localStorage.getItem('registeredUser') || null;
        let pdfData = []; 

        document.addEventListener('DOMContentLoaded', () => {
            updateUserUI();
            fetchInitialData();
        });

        // 1. BUSCAR DADOS NA API
        async function fetchInitialData() {
            try {
                // Busca a lista de PDFs e todos os votos atrelados a cada um deles
                const response = await fetch(`${SUPABASE_URL}/rest/v1/pdfs?select=id,title,url,thumb,votos(username)`, {
                    method: 'GET',
                    headers: supabaseHeaders
                });

                if (!response.ok) throw new Error('Erro ao conectar com o banco de dados.');
                const data = await response.json();

                // Monta a estrutura de dados para o front-end
                pdfData = data.map(pdf => {
                    const listaVotos = pdf.votos || [];
                    return {
                        id: pdf.id,
                        title: pdf.title,
                        url: pdf.url,
                        thumb: pdf.thumb,
                        votes: listaVotos.length, // Conta quantos registros existem na tabela de votos para esse PDF
                        // Verifica se o usuário atual já votou neste PDF
                        userVoted: currentUser ? listaVotos.some(v => v.username === currentUser) : false
                    };
                });

                renderPDFs();
            } catch (error) {
                console.error("Erro na busca:", error);
                alert("Falha ao carregar os dados do servidor.");
            }
        }

        // 2. RENDERIZAR INTERFACE
        function renderPDFs() {
            const grid = document.getElementById('pdfGrid');
            grid.innerHTML = ''; 

            pdfData.forEach(pdf => {
                const card = document.createElement('div');
                card.className = 'pdf-card';
                
                const btnState = currentUser ? '' : 'disabled';
                const btnClass = currentUser ? '' : 'btn-disabled';

                card.innerHTML = `
                    <img src="${pdf.thumb}" alt="Miniatura" class="pdf-thumb" onclick="openModal('${pdf.url}', '${pdf.title}')" title="Clique para abrir">
                    <div class="pdf-title">${pdf.title}</div>
                    <div class="vote-controls">
                        <button class="btn-vote ${btnClass}" ${btnState} onclick="handleVote('${pdf.id}', 'upvote')" ${pdf.userVoted ? 'disabled' : ''}>Votar</button>
                        <span class="vote-count" id="count-${pdf.id}">${pdf.votes}</span>
                        <button class="btn-cancel ${btnClass}" ${btnState} onclick="handleVote('${pdf.id}', 'cancel')" ${!pdf.userVoted ? 'disabled' : ''}>Cancelar</button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // 3. VOTAR OU CANCELAR VOTO
        async function handleVote(pdfId, action) {
            if (!currentUser) return alert("Por favor, registre-se primeiro.");

            try {
                if (action === 'upvote') {
                    // POST: Insere uma nova linha na tabela 'votos'
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/votos`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({ pdf_id: pdfId, username: currentUser })
                    });
                    if (!response.ok) throw new Error('Não foi possível salvar o voto.');

                } else if (action === 'cancel') {
                    // DELETE: Remove a linha da tabela 'votos' onde pdf_id e username batem
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/votos?pdf_id=eq.${pdfId}&username=eq.${currentUser}`, {
                        method: 'DELETE',
                        headers: supabaseHeaders
                    });
                    if (!response.ok) throw new Error('Não foi possível cancelar o voto.');
                }

                // Atualiza a tela puxando os dados reais do banco novamente
                await fetchInitialData();

            } catch (error) {
                console.error("Erro na votação:", error);
                alert(error.message);
            }
        }

        // 4. LÓGICA DO MODAL (PDF)
        function openModal(pdfUrl, title) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('pdfViewer').src = pdfUrl;
            document.getElementById('pdfModal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('pdfModal').style.display = 'none';
            document.getElementById('pdfViewer').src = ''; 
        }

        // 5. REGISTRO SIMPLES DE USUÁRIO
        function registerUser() {
            const name = document.getElementById('userNameInput').value.trim();
            if (name.length < 2) return alert("Digite um nome válido.");
            
            currentUser = name;
            localStorage.setItem('registeredUser', name);
            updateUserUI();
            fetchInitialData(); // Atualiza a lista para checar se ele já havia votado antes
        }

        function logoutUser() {
            currentUser = null;
            localStorage.removeItem('registeredUser');
            updateUserUI();
            fetchInitialData(); 
        }

        function updateUserUI() {
            if (currentUser) {
                document.getElementById('registerSection').style.display = 'none';
                document.getElementById('userInfo').style.display = 'block';
                document.getElementById('displayUserName').innerText = `Olá, ${currentUser}`;
            } else {
                document.getElementById('registerSection').style.display = 'flex';
                document.getElementById('userInfo').style.display = 'none';
                document.getElementById('userNameInput').value = '';
            }
        }
