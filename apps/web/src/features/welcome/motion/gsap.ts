/*
 * GSAP for the welcome page only: this module is imported from the lazy /welcome route, so the
 * library stays out of the app's own bundle. GSAP is free to use under its own Standard
 * "No Charge" licence (https://gsap.com/standard-license), not MIT.
 */
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
// The address bar on phones resizes the viewport while scrolling; that is not a layout change.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText, useGSAP };
