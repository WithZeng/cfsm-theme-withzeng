import { createRouter, createWebHashHistory } from 'vue-router'

// 路由约定：首页 /#/，详情 /#/server/:id；管理入口交给内置主题的 /admin#admin
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/server/:id', name: 'server', component: () => import('./views/ServerView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})
