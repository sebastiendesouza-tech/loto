Loto.pageHeader();
const grid=document.getElementById('grid'),last=document.getElementById('last');
let previous=null;
Loto.onChange(s=>{Loto.pageHeader();const l=Loto.lastNumber();last.textContent=l;if(previous&&previous!==l&&navigator.vibrate) navigator.vibrate(80);previous=l;Loto.renderNumbers(grid);});
Loto.ensureSession();
