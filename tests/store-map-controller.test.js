import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoreMap } from '../src/utils/storeMapController.js';

function harness(t, options = {}) {
  const events = {}, calls = { ready: 0, failed: 0, removed: 0, disconnected: 0, markers: [], selected: [] };
  const node = () => ({ attrs: {}, classes: {}, setAttribute(k,v) { this.attrs[k]=v; }, classList: { toggle() {} } });
  const map = { fitBounds(bounds, options) { calls.bounds = bounds; calls.fit = options; }, setView(position,zoom,options) { calls.view={position,zoom,options}; }, remove() { calls.removed++; }, dragging:{enable(){},disable(){}}, touchZoom:{enable(){},disable(){}}, doubleClickZoom:{enable(){},disable(){}} };
  const layer = { on(name,fn) { events[name]=fn; return this; }, addTo() { return this; }, off() { calls.disconnected++; } };
  const mapEvents = {};
  map.on = (name, fn) => { mapEvents[name] = fn; };
  map.off = name => { delete mapEvents[name]; };
  map.getCenter = () => ({ lat: 14.11, lng: 122.95 });
  map.scrollWheelZoom={enable(){calls.wheel=true;},disable(){calls.wheel=false;}};
  const L = {
    polyline(paths,options) { calls.route={paths,options,removed:false};return {addTo(){return this;},getBounds(){return paths;},remove(){calls.route.removed=true;}}; },
    map(host,options) { calls.options=options; return map; },
    tileLayer(url,options) { calls.tiles={url,options}; return layer; },
    latLngBounds: value => value,
    divIcon: value => value,
    marker(position,options) {
      const element=node();
      const marker = { position, options, element, events:{}, addTo(){return this;}, on(name,fn){this.events[name]=fn;}, off(){this.events={};}, remove(){this.removed=true;}, getElement(){return element;}, setLatLng(value){this.position=value;}, getLatLng(){return this.position;}, setZIndexOffset(value){this.z=value;} };
      calls.markers.push(marker); return marker;
    },
  };
  const controller = createStoreMap(L, { ownerDocument: { createElement:node } }, {
    onReady:()=>calls.ready++, onError:()=>calls.failed++, onSelect:id=>calls.selected.push(id), ...options,
  });
  t.after(()=>controller.destroy());
  return { controller,calls,events,mapEvents };
}
const first = {id:'a',name:'Synthetic <b>branch</b>',number:2,position:{lat:14.6,lng:121}};
const second = {id:'b',name:'Synthetic second branch',number:3,position:{lat:14.7,lng:121.1}};

test('map point selection is explicit, bounded, keyboard-compatible and removed on destroy', t => {
  const selected = [];
  const { controller, mapEvents } = harness(t, { onPoint: point => selected.push(point) });
  const click = mapEvents.click;
  click({ latlng: { lat: 14.11, lng: 122.95 } });
  assert.equal(selected.length, 0);
  controller.pick(true);
  click({ latlng: { lat: 91, lng: 122 } });
  assert.equal(selected.length, 0);
  click({ latlng: { lat: 0, lng: 0 } });
  assert.deepEqual(selected[0].position, { lat: 0, lng: 0 });
  controller.chooseCenter();
  assert.deepEqual(selected[1].position, { lat: 14.11, lng: 122.95 });
  controller.pick(false); controller.chooseCenter();
  assert.equal(selected.length, 2);
  controller.destroy();
  assert.equal(mapEvents.click, undefined);
  click({ latlng: { lat: 14, lng: 122 } });
  assert.equal(selected.length, 2);
});

test('map reconciles stable markers, keeps directory numbers, rejects invalid pins and uses text labels', t => {
  const {controller,calls}=harness(t);
  controller.update([first,second,{id:'bad',position:{lat:91,lng:0}}]);
  assert.equal(calls.markers.length,2);
  assert.equal(calls.markers[0].options.icon.html.textContent,'02');
  assert.equal(calls.markers[0].element.attrs['aria-label'],'Select store 2: Synthetic <b>branch</b>');
  calls.markers[0].events.click(); assert.deepEqual(calls.selected,['a']);
  const keyEvent = key => ({key, preventDefault(){this.prevented=true;}, stopPropagation(){this.stopped=true;}});
  const enter = keyEvent('Enter'), space = keyEvent(' '), arrow = keyEvent('ArrowRight');
  calls.markers[1].element.onkeydown(enter);
  calls.markers[0].element.onkeydown(space);
  calls.markers[0].element.onkeydown(arrow);
  calls.markers[0].element.onkeydown({...keyEvent('Enter'),repeat:true});
  assert.deepEqual(calls.selected,['a','b','a']);
  assert.equal(enter.prevented,true); assert.equal(space.stopped,true);
  assert.equal(arrow.prevented,undefined);
  controller.select('b'); assert.equal(calls.markers[1].element.attrs['aria-pressed'],'true');
  controller.update([{...second,position:{lat:15,lng:122}}]);
  assert.equal(calls.markers.length,2); assert.equal(calls.markers[0].removed,true);
  assert.equal(calls.markers[0].element.onkeydown,null);
  assert.deepEqual(calls.markers[1].position,[15,122]);
  controller.focus('b'); assert.equal(calls.view.zoom,15);
  controller.update([]); controller.fit(); assert.equal(calls.markers[1].removed,true);
});

test('map preserves page scrolling, limits tile work, honors reduced motion and tears down once', t => {
  const {controller,calls,events}=harness(t,{reducedMotion:true});
  assert.equal(calls.options.scrollWheelZoom,false);
  assert.equal(calls.options.dragging,true);
  controller.wheel(true);assert.equal(calls.wheel,true);
  controller.wheel(false);assert.equal(calls.wheel,false);
  assert.equal(calls.options.zoomAnimation,false);
  assert.equal(calls.tiles.options.detectRetina,false);
  assert.equal(calls.tiles.options.keepBuffer,1);
  assert.match(calls.tiles.options.attribution,/OpenStreetMap/);
  controller.update([first]); controller.focus('a'); assert.equal(calls.view.options.animate,false);
  controller.destroy(); controller.destroy();
  assert.equal(calls.removed,1); assert.equal(calls.disconnected,1);
  assert.equal(calls.markers[0].removed,true);
  events.tileload(); assert.equal(calls.ready,0);
});

test('partial tile success stays usable; a failed tile batch invokes fallback and recreation can succeed', t => {
  const {calls,events,controller}=harness(t);
  events.loading(); events.tileerror(); events.tileload(); events.load();
  assert.equal(calls.ready,1); assert.equal(calls.failed,0);
  events.loading(); events.tileerror(); events.load(); assert.equal(calls.failed,1);
  controller.destroy();
  const retry=harness(t); retry.events.loading(); retry.events.tileload(); retry.events.load();
  assert.equal(retry.calls.ready,1); assert.equal(retry.calls.failed,0);
});

test('search origin is distinct, works without branch pins and is removed on clear and destroy', t => {
  const {controller,calls}=harness(t);
  controller.update([]);
  controller.setOrigin({label:'Synthetic place',position:{lat:0,lng:0}});
  assert.deepEqual(calls.view.position,[0,0]);
  assert.equal(calls.markers[0].options.interactive,false);
  assert.equal(calls.markers[0].element.attrs['aria-label'],'Search point: Synthetic place');
  controller.fit(); assert.deepEqual(calls.bounds,[[0,0]]);
  controller.setOrigin(null); assert.equal(calls.markers[0].removed,true);
  controller.setOrigin({label:'Invalid',position:{lat:100,lng:0}}); assert.equal(calls.markers.length,1);
  controller.setOrigin({label:'Replacement',position:{lat:1,lng:2}});
  controller.destroy(); assert.equal(calls.markers[1].removed,true);
});

test('map remains explorable with zero branches and draws only valid bounded routes',t=>{
  const {controller,calls}=harness(t);
  controller.update([]); assert.deepEqual(calls.view.position,[12.5,122]); assert.equal(calls.view.zoom,5);
  controller.setRoute({paths:[[[14.11,122.95],[14.12,122.96]]],from:'Synthetic <b>start</b>',to:'Synthetic destination'}); assert.equal(calls.route.options.interactive,false);
  assert.equal(calls.markers.length,2);
  assert.equal(calls.markers[0].options.icon.html.textContent,'A');
  assert.equal(calls.markers[0].element.attrs['aria-label'],'A: Synthetic <b>start</b>');
  assert.equal(calls.markers[1].options.icon.html.textContent,'B');
  assert.deepEqual(calls.markers[1].position,[14.12,122.96]);
  controller.setRoute(null); assert.equal(calls.route.removed,true);
  assert.ok(calls.markers.every(marker=>marker.removed));
  controller.setRoute({paths:[[[91,0],[0,0]]]});assert.equal(calls.route.removed,true);
  assert.equal(calls.markers.length,2);
  controller.setRoute({paths:[[[14.11,122.95],[14.12,122.96]]]});
  controller.destroy();
  assert.ok(calls.markers.every(marker=>marker.removed));
});
