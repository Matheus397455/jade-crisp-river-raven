(() => {
window.__gordaoAbort?.abort();
const __gordaoAc = new AbortController();
window.__gordaoAbort = __gordaoAc;
const __addEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, fn, opts) {
  if (opts && typeof opts === "object" && opts.signal) {
    return __addEventListener.call(this, type, fn, opts);
  }
  const base = opts === undefined ? {} : typeof opts === "boolean" ? { capture: opts } : { ...opts };
  return __addEventListener.call(this, type, fn, { ...base, signal: __gordaoAc.signal });
};

/* ============ CONFIG ============ */
const CONFIG = {
  orderUrl: "https://acaidogordao.mandarpedido.com/whatsapp",
  whatsapp: "5511919337899",
  mapsUrl:  "https://www.google.com/maps/search/?api=1&query=A%C3%A7a%C3%AD+do+Gord%C3%A3o+Av.+Jo%C3%A3o+Dias+915+S%C3%A3o+Paulo",
  address:  "Av. João Dias, 915 - Santo Amaro, São Paulo - SP, 04723-001"
};
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

if (CONFIG.address)  $("#addr").textContent  = CONFIG.address;
if (CONFIG.mapsUrl)  $("#mapsLink").href     = CONFIG.mapsUrl;
if (CONFIG.orderUrl){
  $("#orderTxt").textContent = "Faça seu pedido pelo nosso canal oficial.";
  $$("[data-order]").forEach(a => {
    a.href = CONFIG.orderUrl; a.target = "_blank"; a.rel = "noopener";
  });
}

/* ============ HORÁRIO DE FUNCIONAMENTO ============ */
/* Horário semanal ainda não confirmado: enquanto HOURS for null, o site mostra um link para o horário no Google Maps.
   Para ativar o selo "Aberto agora", preencha 7 itens (domingo primeiro): ["Domingo",[abre,fecha]] em horas (ex.: [14,22.5]) ou null = fechado. */
const HOURS=null;
const fmtH=h=>{const m=Math.round((h%1)*60);return Math.floor(h)+"h"+(m?String(m).padStart(2,"0"):"")};
function renderHours(){
  const st=$("#status");
  if(!HOURS){$("#days").hidden=true;st.className="status";st.href=CONFIG.mapsUrl;return}
  const now=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Sao_Paulo"}));
  const d=now.getDay(),t=now.getHours()+now.getMinutes()/60;
  $("#days").innerHTML=HOURS.map(([n,h],i)=>`<li${i===d?' class="today" aria-current="date"':""}><b>${n}</b><span>${h?fmtH(h[0])+" – "+fmtH(h[1]):"Fechado"}</span></li>`).join("");
  const today=HOURS[d][1];
  if(today&&t>=today[0]&&t<today[1]){st.className="status open";st.textContent="Aberto agora · fecha às "+fmtH(today[1]);return}
  let txt="Fechado";
  if(today&&t<today[0])txt+=" · abre hoje às "+fmtH(today[0]);
  else for(let k=1;k<=7;k++){const nx=HOURS[(d+k)%7];if(nx[1]){txt+=" · abre "+(k===1?"amanhã":nx[0].toLowerCase())+" às "+fmtH(nx[1][0]);break}}
  st.className="status closed";st.textContent=txt;
}
renderHours();if(HOURS)setInterval(renderHours,60000);

/* ============ MENU MOBILE ============ */
const menuBtn = $("#menuBtn"), drawer = $("#drawer");
menuBtn.addEventListener("click", () => {
  const open = drawer.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
drawer.addEventListener("click", () => {
  drawer.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
});

/* ============ NAVEGAÇÃO ============ */
const navLinks=[...$$("nav.primary a")],drLinks=[...$$("#drawer a:not([data-order])")],hdr=$("#inicio header"),pill=document.createElement("span");
pill.className="nav-pill";pill.setAttribute("aria-hidden","true");$("nav.primary ul").prepend(pill);
let pillReady=false;
function placePill(){
  const a=navLinks.find(l=>l.hasAttribute("aria-current"));if(!a||!a.offsetWidth)return;
  pill.style.width=a.offsetWidth+"px";pill.style.transform=`translateX(${a.offsetLeft}px)`;
  if(!pillReady){requestAnimationFrame(()=>pill.classList.add("ready"));pillReady=true}
}
function setCurrent(id){
  [...navLinks,...drLinks].forEach(a=>a.getAttribute("href")==="#"+id?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current"));
  placePill();
}
if("IntersectionObserver" in window){
  const spy=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setCurrent(e.target.id)}),{rootMargin:"-45% 0px -50% 0px"});
  ["inicio","cardapio","sobre","localizacao"].forEach(id=>{const el=document.getElementById(id);if(el)spy.observe(el)});
}
setCurrent("inicio");
addEventListener("resize",placePill);
if(document.fonts)document.fonts.ready.then(placePill);
let lastY=scrollY;
addEventListener("scroll",()=>{
  const y=scrollY,d=y-lastY;
  if(Math.abs(d)>6){hdr.classList.toggle("nav-hide",d>0&&y>420&&!drawer.classList.contains("open"));lastY=y}
},{passive:true});
function closeDrawer(focus){drawer.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");if(focus)menuBtn.focus()}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))closeDrawer(true)});
document.addEventListener("click",e=>{if(drawer.classList.contains("open")&&!e.target.closest("#drawer,#menuBtn"))closeDrawer(false)});

/* ============ CARDÁPIO (dinâmico) ============ */
/* Cardápio transcrito das telas do site de pedidos (preços em R$).
   Flags: a = cliente escolhe tamanho/acompanhamentos (pedido via WhatsApp) · f = "a partir de" · r = recomendado · n = novidade.
   Itens sem "a" vão para o carrinho. */
const RAW=[["acai","Monte do seu jeito","Copo de 500ml","O equilíbrio perfeito entre quantidade e sabor! Escolha sua base favorita: açaí, cupuaçu ou outros cremes.",33.9,"ar"],["acai","Monte do seu jeito","Copo de 700ml","Quando a vontade é grande, o copão de 700 ml é a escolha certa! Monte do seu jeito com açaí, cupuaçu ou outros cremes.",39.9,"a"],["acai","Monte do seu jeito","Copo de 300ml","O tamanho ideal para matar a vontade! Monte do seu jeito com a base que preferir: açaí, cupuaçu ou outro creme.",28.9,"a"],["acai","Combo","2 Açaís - Escolha o Tamanho","2 açaís no copo para compartilhar, com recheio no meio e em cima. Tamanhos: 300 ml, 500 ml ou 700 ml.",52.9,"af"],["acai","Trufado","Trufado de Nutella com Morango","Nutella, morango, leite condensado e leite em pó com o creme de sua escolha. Tamanhos: 300 ml, 500 ml ou 700 ml.",39.9,"af"],["acai","Trufado","Trufado de Pistache","Nossos cremes no copo, servidos com calda de pistache e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",47.9,"af"],["acai","Trufado","Trufado de Nutella com M&amp;M'S","Nossos cremes no copo com até 4 acompanhamentos, Nutella e M&amp;M'S. Tamanhos: 300 ml, 500 ml ou 700 ml.",37.9,"af"],["acai","Trufado","Trufado de Creme de Ovomaltine","Nossos cremes no copo, servidos com creme de Ovomaltine e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",39.9,"af"],["acai","Trufado","Trufado de Creme de Leitinho","Nossos cremes no copo, servidos com creme de Leitinho e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",37.9,"af"],["acai","Trufado","Trufado de Kinder Bueno","Nossos cremes no copo, servidos com Nutella, creme de Leitinho e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",42.9,"af"],["acai","Trufado","Trufado de Rafaello","Nossos cremes no copo, servidos com creme de Leitinho e coco ralado. Tamanhos: 300 ml, 500 ml ou 700 ml.",42.9,"af"],["acai","Trufado","Trufado Ferrero Rocher","Nossos cremes no copo, servidos com Nutella, amendoim granulado e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",42.9,"af"],["acai","Trufado","Trufado de Creme de Cookies com Oreo","Nossos cremes no copo, servidos com creme de cookies e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",37.9,"af"],["acai","Trufado","Trufado de Creme de Kitkat","Nossos cremes no copo, servidos com creme de Kitkat, leite condensado e leite em pó. Tamanhos: 300 ml, 500 ml ou 700 ml.",37.9,"af"],["acai","Trufado","Trufado de Brownie","Brownie, Nutella, leite condensado e leite em pó com o creme de sua escolha. Tamanhos: 300 ml, 500 ml ou 700 ml.",42.9,"af"],["acai","Tradicional","Copo com Banana, Granola e Leite Condensado","Nossos cremes no copo com até 3 acompanhamentos: banana, granola e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",26.9,"af"],["acai","Tradicional","Copo com Banana, Sucrilhos e Leite Condensado","Nossos cremes no copo com até 3 acompanhamentos: banana, sucrilhos e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",26.9,"af"],["acai","Tradicional","Copo com Leite em Pó e Leite Condensado","Nossos cremes no copo com até 3 acompanhamentos: leite em pó e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",26.9,"af"],["acai","Tradicional","Copo com Morango, Leite em Pó e Leite Condensado","Nossos cremes no copo com até 3 acompanhamentos: morango, leite em pó e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",26.9,"af"],["acai","Tradicional","Copo com Paçoca, Leite em Pó e Leite Condensado","Nossos cremes no copo com até 3 acompanhamentos: paçoca, leite em pó e leite condensado. Tamanhos: 300 ml, 500 ml ou 700 ml.",26.9,"af"],["acai","Na tigela","Tigela de 250ml","Nosso açaí super cremoso na tigela de 250 ml, com até 3 acompanhamentos gratuitos à sua escolha.",31.9,"a"],["acai","Na tigela","Tigela de 500ml","Nosso açaí super cremoso na tigela de 500 ml, com até 3 acompanhamentos gratuitos à sua escolha.",37.9,"a"],["acai","Na tigela","Tigela de 750ml","Nosso açaí super cremoso na tigela de 750 ml, com até 3 acompanhamentos gratuitos à sua escolha.",47.9,"a"],["lanches","Combo","Combo Galera","4 smashes. Acompanha 3 molhos: ketchup defumado, maionese bacon e maionese verde.",99.9,""],["lanches","Combo","Combo Casal","2 smashes com cheddar cremoso, 1 batata grande com cheddar e bacon, 1 porção de anéis de cebola e 3 molhos da casa.",95.0,""],["lanches","Smash","Smash Duplo","Delicioso smash com 2 carnes de costela de 60g, queijo prato e a irresistível maionese verde da casa!",29.9,"n"],["lanches","Burger","Gorgonzola","Carne de costela bovina 150g, fatia grande de queijo gorgonzola e cebola caramelizada, finalizado com molho da casa.",39.9,"n"],["lanches","Burger","Da Roça","Blend de costela 150g, doce de leite moça, provolone e bacon, finalizado com nossa maionese de bacon defumada.",39.9,"n"],["lanches","Burger","Pig Burguer","Vinagrete de picles, burger de linguiça suína e queijo provolone, finalizado com maionese defumada.",34.9,"n"],["lanches","Burger","Caipirão","Frango suculento e crocante feito na casa, catupiry empanado, bacon, alface e tomate com maionese grill bacon.",44.9,"n"],["lanches","Burger","Poderoso","Blend de costela com 150g, pão brioche torrado no requeijão, ketchup defumado, queijo empanado, picles e cebola caramelizada!",49.9,""],["lanches","Burger","Autêntico","1 carne de costela 150g, pão torrado no requeijão, maionese verde e queijo prato.",29.9,""],["lanches","Burger","Nobre","1 carne de costela 150g, pão torrado no requeijão, maionese verde, Catupiry e alface.",31.9,""],["lanches","Burger","Clássico","1 carne de costela 150g, pão torrado no requeijão, maionese verde, queijo prato, alface, tomate e cebola roxa.",36.9,""],["lanches","Burger","Supremo","1 carne de costela 150g, pão torrado no requeijão, maionese verde, cheddar, bacon, cebola empanada, alface e tomate.",39.9,""],["lanches","Burger","Suculento","1 carne de costela 150g, pão torrado no requeijão, maionese verde, queijo prato, bacon, rúcula e tomate cereja.",44.9,""],["lanches","Burger","Brabo","1 carne de costela 150g, pão torrado no requeijão, maionese verde, cheddar, bacon e cebola caramelizada.",44.9,""],["lanches","Burger","Do Chef","1 carne de costela 150g, pão torrado no requeijão, maionese verde, queijo coalho, banana da terra, bacon, rúcula e mel.",49.9,""],["lanches","Burger","Tropical","1 carne de costela 150g, pão torrado no requeijão, maionese verde, queijo coalho, abacaxi, bacon, rúcula e tomate cereja.",49.9,""],["lanches","Burger","Gordão","1 carne de costela 150g, pão torrado no requeijão, maionese verde, queijo coalho, bacon, ovo, Catupiry e cebola empanada.",49.9,""],["lanches","Burger","Monster Bacon","2 carnes de costela 150g cada, pão torrado no requeijão, maionese verde, bacon e cheddar.",54.9,""],["lanches","Burger","Gordinho","2 carnes de costela 150g cada, pão torrado no requeijão, maionese verde, queijo prato, Catupiry, alface e tomate.",59.9,""],["lanches","Burger","Chicken Grill","Pão brioche, maionese grill bacon, frango empanado, alface e queijo prato.",39.9,""],["lanches","Burger","Mineirinho","Pão brioche, maionese verde, burguer de costela de 150 g, queijo minas e geleia de pimenta.",39.9,""],["lanches","Burger","Veggie Salada","1 hambúrguer de carne vegetal 100g, pão torrado no requeijão, maionese verde, queijo prato, alface e tomate.",59.9,""],["lanches","Burger","Veggie Caramelizado","1 hambúrguer de carne vegetal 100g, pão torrado no requeijão, maionese verde, cheddar e cebola caramelizada.",59.9,""],["porcoes","Porção","Batata Frita 180g","Porção individual.",14.9,""],["porcoes","Porção","Batata Frita G 250g","Porção grande, 250g.",19.9,""],["porcoes","Porção","Batata, Catupiry, Cheddar e Bacon 250g","Porção de 250g.",29.9,""],["porcoes","Porção","Onion Rings 140g","Porção de 140g.",19.9,""],["porcoes","Porção","Nugget Supreme 8 Uni","Porção com 8 unidades.",19.9,""],["porcoes","Porção","Almofadinha de Queijo Gouda 8 Uni","Porção com 8 unidades.",39.9,""],["porcoes","Porção","Stick de Mussarela 8 Uni","Porção com 8 unidades.",39.9,""],["milkshake","Milkshake","Milk-Shake Morango","O nosso irresistível milk-shake com pedaços de morango, calda de morango e muito chantilly.",29.9,""],["milkshake","Milkshake","Milk-Shake Ovomaltine","O nosso irresistível milk-shake com ovomaltine em flocos, calda de chocolate e muito chantilly.",29.9,""],["milkshake","Milkshake","Milk-Shake Ninho","O nosso irresistível milk-shake com leite em pó e muito chantilly.",29.9,""],["milkshake","Milkshake","Milk-Shake Nutella","O nosso irresistível milk-shake com Nutella e muito chantilly.",32.9,""],["milkshake","Milkshake","Milk-Shake Oreo","O nosso irresistível milk-shake com Oreo, calda de chocolate e muito chantilly.",32.9,""],["milkshake","Milkshake","Milk-Shake Banoffe","O nosso irresistível milk-shake com banana, calda de caramelo, farofa de amendoim e muito chantilly.",32.9,""],["milkshake","Milkshake","Milk-Shake Pistache","O nosso irresistível milk-shake com calda de pistache, amendoim granulado e muito chantilly.",32.9,""],["bebidas","Refrigerante e água","Coca-Cola 350ml lata","350 ml, lata.",7.0,""],["bebidas","Refrigerante e água","Coca-Cola Zero 350ml lata","Zero, 350 ml, lata.",7.0,""],["bebidas","Refrigerante e água","Fanta Laranja 350ml lata","Refrigerante Fanta sabor laranja, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Fanta Uva 350ml lata","Refrigerante Fanta sabor uva, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Fanta Guaraná 350ml lata","Guaraná, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Fanta Guaraná Zero 350ml lata","Guaraná zero, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Sprite 350ml lata","Sprite, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Sprite Zero 350ml lata","Sprite zero, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Fanta Maracujá 350ml lata","Fanta sabor maracujá, lata de 350 ml.",7.0,""],["bebidas","Refrigerante e água","Mate Leão Limão com Gás Lata","Mate Leão limão com gás, lata.",7.0,""],["bebidas","Refrigerante e água","Água 500ml","Sem gás.",7.0,""],["bebidas","Refrigerante e água","Água com Gás 500ml","Com gás.",7.0,""],["bebidas","Energético","Monster Mango Loco","Energético, 473 ml.",15.0,""],["bebidas","Energético","Monster Energy LT","Energético, 473 ml.",15.0,""],["bebidas","Energético","Monster Energy Zero","Energético zero, 473 ml.",15.0,""],["bebidas","Suco","Suco de Laranja","Suco.",14.9,""],["bebidas","Suco","Suco de Limão","Suco.",14.9,""],["bebidas","Suco","Suco de Morango","Suco.",14.9,""],["bebidas","Suco","Suco de Maracujá","Suco.",14.9,""],["bebidas","Suco","Suco de Manga","Suco.",14.9,""],["bebidas","Suco","Suco de Laranja com Morango","Suco.",19.9,""],["bebidas","Suco","Suco de Morango com Hortelã","Suco.",19.9,""],["bebidas","Suco","Suco de Abacaxi com Hortelã","Suco.",19.9,""],["bebidas","Smoothie","Smoothie","Nosso delicioso creme super cremoso, batido com leite, leite condensado e fruta fresca à sua escolha. Tamanhos: 300 ml, 500 ml ou 700 ml.",29.9,"af"],["bebidas","Smoothie","Smoothie Açaí com Laranja","Nosso delicioso açaí super cremoso, batido com laranja. Tamanhos: 300 ml, 500 ml ou 700 ml.",29.9,"af"],["bebidas","Smoothie","Smoothie Açaí com Maracujá","Nosso delicioso açaí super cremoso, batido com maracujá. Tamanhos: 300 ml, 500 ml ou 700 ml.",29.9,"af"],["bebidas","Vitamina","Vitamina de Açaí com Banana","Vitamina de açaí com banana, 500 ml.",19.99,""],["alcool","Caipirinha · +18","Caipirinha de Limão","Bebida alcoólica, venda somente para maiores de 18 anos.",19.9,""],["alcool","Caipirinha · +18","Caipirinha de Morango com Maracujá","Bebida alcoólica, venda somente para maiores de 18 anos.",19.9,""],["alcool","Caipirinha · +18","Caipirinha de Açaí","Bebida alcoólica, venda somente para maiores de 18 anos.",24.9,""]];
const ART_BY={acai:"cup",lanches:"burger",porcoes:"combo",milkshake:"cup",bebidas:"cup",alcool:"cup"};
const MENU=RAW.map(([cat,sub,name,desc,price,fl],i)=>({id:"p"+i,cat,sub,name,desc,price,ask:fl.includes("a"),from:fl.includes("f"),rec:fl.includes("r"),nov:fl.includes("n"),art:ART_BY[cat]}));
/* Mais pedidos: edite esta lista (nomes exatos dos itens do cardápio, na ordem de exibição). */
const TOP=["Copo de 700ml","Copo de 500ml","Trufado de Brownie","Supremo","Monster Bacon","Autêntico","Trufado de Nutella com Morango","Trufado de Nutella com M&amp;M'S"];
const CATS=[["top","Mais pedidos"],["acai","Açaí"],["lanches","Lanches"],["porcoes","Porções"],["milkshake","Milkshake"],["bebidas","Bebidas"],["alcool","Alcoólicas +18"]];
const ART={cup:"0 0 400 420",burger:"0 0 300 300",combo:"0 0 400 320"};
const BRL=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const byId=Object.fromEntries(MENU.map(i=>[i.id,i]));
const state={cat:"top",q:"",cart:new Map(),total:0};
const grid=$("#grid"),chipsEl=$("#chips"),sheet=$("#sheet"),scrim=$("#scrim");
let opener=null;

chipsEl.innerHTML=CATS.map(([k,l])=>`<button class="chip" type="button" data-cat="${k}" aria-pressed="${k==="top"}">${l}</button>`).join("");
const wa=t=>`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t)}`;
const ctl=it=>{if(it.price==null)return `<a class="btn solid ask" href="${wa("Olá! Quero pedir: "+it.name+(it.price!=null?" ("+(it.from?"a partir de ":"")+BRL(it.price)+")":""))}" target="_blank" rel="noopener">Pedir</a>`;
  const n=state.cart.get(it.id)||0;
  return n?`<div class="stepper"><button type="button" data-dec="${it.id}" aria-label="Remover um ${it.name}">−</button><output>${n}</output><button type="button" data-inc="${it.id}" aria-label="Adicionar mais um ${it.name}">+</button></div>`
          :`<button class="add" type="button" data-inc="${it.id}" aria-label="Adicionar ${it.name}">+</button>`};
const card=(it,i)=>`<article class="card" data-id="${it.id}" style="--i:${Math.min(i,8)}">${it.rec?'<span class="flag">Recomendado</span>':it.nov?'<span class="flag nov">Novidade</span>':""}<div class="art" aria-hidden="true"><svg viewBox="${ART[it.art]}"><use href="#${it.art}"/></svg></div><div>${it.sub?`<small class="sub">${it.sub}</small>`:""}<h3>${it.name}</h3><p>${it.desc}</p></div><div class="foot">${it.price==null?'<span class="tagq">Consulte o preço</span>':`<span class="price">${it.from?"<em>a partir de</em> ":""}${BRL(it.price)}</span>`}<div class="ctl">${ctl(it)}</div></div></article>`;

function renderGrid(){
  const q=state.q.trim().toLowerCase();
  chipsEl.classList.toggle("searching",!!q);
  /* busca varre o cardápio inteiro; sem busca, mostra a aba escolhida */
  const list=q?MENU.filter(it=>(it.name+" "+it.desc+" "+(it.sub||"")).toLowerCase().includes(q))
    :state.cat==="top"?TOP.map(n=>MENU.find(it=>it.name===n)).filter(Boolean)
    :MENU.filter(it=>it.cat===state.cat);
  grid.innerHTML=list.length?list.map(card).join(""):'<p class="empty">Nenhum item encontrado. Tente outra busca ou categoria.</p>';
}
function renderCart(){
  let n=0,t=0;const rows=[];
  state.cart.forEach((q,id)=>{const it=byId[id];n+=q;t+=q*it.price;
    rows.push(`<li data-line="${id}"><div><b>${it.name}</b><span>${it.from?"a partir de ":""}${BRL(it.price*q)}${it.ask||it.from?" · a combinar no WhatsApp":""}</span></div><div class="stepper"><button type="button" data-dec="${id}" aria-label="Remover um ${it.name}">−</button><output>${q}</output><button type="button" data-inc="${id}" aria-label="Adicionar mais um ${it.name}">+</button></div></li>`)});
  state.total=t;
  $("#lines").innerHTML=rows.join("")||'<li class="empty">Seu pedido está vazio.</li>';
  const est=[...state.cart.keys()].some(id=>byId[id].ask||byId[id].from);
  $("#totalLbl").textContent=est?"Total estimado":"Total";$("#total").textContent=BRL(t);
  const b=$("#badge");b.hidden=!n;b.textContent=n;
  if(n>(renderCart.p||0)&&b.animate)b.animate([{transform:"scale(1)"},{transform:"scale(1.55)"},{transform:"scale(1)"}],{duration:380,easing:"cubic-bezier(.34,1.56,.64,1)"});
  renderCart.p=n;
  const bar=$("#bar");bar.hidden=!n||sheet.classList.contains("open");
  $("#barN").textContent=n+(n===1?" item":" itens");$("#barT").textContent=BRL(t);
  $("#send").disabled=!n||!CONFIG.whatsapp;
  $("#sendNote").textContent=!CONFIG.whatsapp?"":est?"Tamanho e acompanhamentos são combinados no WhatsApp; o valor final é confirmado lá.":"O pedido abre no WhatsApp.";
}
function change(id,d,fromSheet){
  const n=Math.max(0,(state.cart.get(id)||0)+d);
  n?state.cart.set(id,n):state.cart.delete(id);
  const c=grid.querySelector(`[data-id="${id}"] .ctl`);if(c)c.innerHTML=ctl(byId[id]);
  renderCart();
  const f=fromSheet?$(`#lines [data-line="${id}"] [data-inc]`):grid.querySelector(`[data-id="${id}"] [data-inc]`);
  if(f)f.focus();
}
function openSheet(from){opener=from;sheet.removeAttribute("inert");sheet.classList.add("open");scrim.classList.add("open");$("#bar").hidden=true;$("#closeSheet").focus()}
function closeSheet(){sheet.classList.remove("open");scrim.classList.remove("open");sheet.setAttribute("inert","");renderCart();if(opener)opener.focus()}

chipsEl.addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;
  state.cat=b.dataset.cat;chipsEl.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c===b));renderGrid()});
$("#q").addEventListener("input",e=>{state.q=e.target.value;renderGrid()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-inc],[data-dec]");if(!b)return;
  change(b.dataset.inc||b.dataset.dec,b.dataset.inc?1:-1,!!b.closest(".sheet"))});
$("#cartBtn").addEventListener("click",e=>openSheet(e.currentTarget));
$("#bar").addEventListener("click",e=>openSheet(e.currentTarget));
$("#ctaCart").addEventListener("click",e=>openSheet(e.currentTarget));
$("#closeSheet").addEventListener("click",closeSheet);
scrim.addEventListener("click",closeSheet);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("open"))closeSheet()});
$("#send").addEventListener("click",()=>{
  if(!CONFIG.whatsapp||!state.cart.size)return;
  const est=[...state.cart.keys()].some(id=>byId[id].ask||byId[id].from);
  const lines=[...state.cart].map(([id,q])=>{const it=byId[id];return `• ${q}x ${it.name}${it.ask||it.from?" (tamanho/acompanhamentos a combinar)":""} — ${it.from?"a partir de ":""}${BRL(it.price*q)}`});
  window.open(wa(`Olá! Gostaria de fazer um pedido:\n${lines.join("\n")}\n${est?"Total estimado":"Total"}: ${BRL(state.total)}`),"_blank","noopener");
});
renderGrid();renderCart();
if(!MENU.some(i=>i.price!=null))$("#cartBtn").hidden=true;

/* ============ HERO VIDEO ============ */
(function heroVideo(){
  const stage = document.getElementById("inicio");
  const wrap  = document.getElementById("videoWrap");
  const video = document.getElementById("heroVideo");
  if (!video || !wrap) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Autoplay (muted + playsinline required by browsers)
  const tryPlay = () => {
    const p = video.play();
    if (p !== undefined) {
      p.then(() => {
        stage.classList.add("playing");
      }).catch(() => {
        // Autoplay blocked — user can still interact; try again on first gesture
        const unlock = () => {
          video.play().then(() => stage.classList.add("playing")).catch(()=>{});
          document.removeEventListener("pointerdown", unlock);
          document.removeEventListener("keydown", unlock);
        };
        document.addEventListener("pointerdown", unlock, { once: true });
        document.addEventListener("keydown", unlock, { once: true });
      });
    }
  };


  // Start as soon as enough data is ready
  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener("canplay", tryPlay, { once: true });
    // Fallback in case canplay is late
    setTimeout(tryPlay, 600);
  }

  // Pausa o vídeo fora da tela (CPU/bateria)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (stage.classList.contains("playing")) video.play().catch(()=>{}); }
      else video.pause();
    }).observe(stage);
  }

  // Subtle header border when scrolled past hero
  const onScroll = () => {
    stage.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ============ SCROLL REVEAL ============ */
(function scrollReveal(){
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal, .reveal-stagger");

  if (!targets.length) return;

  if (prefersReduced || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.12
  });

  targets.forEach(el => observer.observe(el));
})();
EventTarget.prototype.addEventListener = __addEventListener;
})();
