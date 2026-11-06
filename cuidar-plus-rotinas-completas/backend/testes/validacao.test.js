const test=require('node:test');
const assert=require('node:assert/strict');
const {idPositivo,texto,emailValido,dataValida,inteiroEntre}=require('../src/utilitarios/validacao');
test('IDs positivos válidos',()=>{assert.equal(idPositivo('12'),12);assert.equal(idPositivo(-1),null);assert.equal(idPositivo('abc'),null);});
test('texto sem vazio e limite',()=>{assert.equal(texto('  Maria  '),'Maria');assert.equal(texto('  '),null);assert.equal(texto('x'.repeat(101)),null);});
test('e-mails validados e minúsculos',()=>{assert.equal(emailValido(' TESTE@EXEMPLO.COM '),'teste@exemplo.com');assert.equal(emailValido('invalido'),null);});
test('datas rigorosas e ano bissexto',()=>{assert.equal(dataValida('2024-02-29'),true);assert.equal(dataValida('2026-02-29'),false);assert.equal(dataValida('2026-04-31'),false);});
test('dor 0..10 inteiro',()=>{assert.equal(inteiroEntre(0,0,10),true);assert.equal(inteiroEntre(10,0,10),true);assert.equal(inteiroEntre(11,0,10),false);assert.equal(inteiroEntre('3',0,10),false);});
