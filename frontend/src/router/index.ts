import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/upload', component: () => import('../views/UploadView.vue') },
    { path: '/results/:token', component: () => import('../views/DashboardView.vue') },
    { path: '/community', component: () => import('../views/CommunityView.vue') },
    { path: '/impressum', component: () => import('../views/ImpressumView.vue') },
    { path: '/datenschutz', component: () => import('../views/DatenschutzView.vue') },
  ],
});
