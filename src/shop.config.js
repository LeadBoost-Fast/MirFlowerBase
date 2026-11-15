/* Настройки конкретной установки (магазина). Остальной сайт у всех магазинов одинаковый, у каждого магазина свой такой файл.
   Здесь только то, что нельзя узнать из базы до входа или нужно как запасное значение. Остальное владелец меняет в «Настройках». */
window.SHOP_CFG={
 name:"Mirflowers",
 city:"Актау",gisCity:"aktau",mapCenter:[51.1722,43.6481],
 ownerEmail:"tilegen615@gmail.com",headEmail:"nash0082008@icloud.com",
 mainLoc:"19А мкр, 107/1",
 /* Реквизиты для страниц privacy.html, terms.html, data-deletion.html (их требует Meta). Пустое подсвечивается жёлтым, с пустыми реквизитами страницы публиковать нельзя */
 legal:{owner:"",bin:"",email:"",phone:"",address:"",storage:""},
 links:[["Instagram","https://www.instagram.com/mir_flowers_aktau"],["2ГИС · 19А мкр, 107/1","https://2gis.kz/aktau/firm/70000001100232006"],["2ГИС · 10 мкр, 10/2","https://2gis.kz/aktau/firm/70000001117708431"],["WhatsApp · 19А мкр","https://wa.me/77771027292"],["WhatsApp · 10 мкр","https://wa.me/77067073622"]],
 /* только самый первый запуск, когда настроек магазина в базе ещё нет; у новых магазинов seed не задаётся, их создаёт мастер настройки */
 seed:{locations:[{name:"10 мкр, 10/2",addr:"10-й микрорайон, 10/2, Актау",active:true}],settings:{name:"Mirflowers",addr:"Микрорайон 19А, 107/1, 1 этаж, Актау",accent:"#a35a6b",cur:"KZT",split:true,phone:"+7 777 102 7292 · +7 706 707 3622",hours:"Ежедневно 10:00–02:00 (19А мкр) · 10:00–01:00 (10 мкр)"}}
};
