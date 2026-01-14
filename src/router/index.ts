import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import HomePage from '../views/HomePage.vue'
import { useUserStore } from '@/stores/user';
import CreatorMulti from '@/views/CreatorMulti.vue';
import CreatorInterface from '@/views/CreatorInterface.vue';
import FkazPlayer from '@/views/FkazPlayer.vue';
import JawbPlayer from '@/views/JawbPlayer.vue';
import JawwPlayer from '@/views/JawwPlayer.vue';
import LybjPlayer from '@/views/LybjPlayer.vue';
import DepositTool from '@/views/DepositTool.vue';
import CPTool from '@/views/CPTool.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Login',
        component: Login
    },
    {
        path: '/HomePage',
        name: 'HomePage',
        component: HomePage,
        meta: { requiresAuth: true }
    },
    {
        path: '/CreatorMulti',
        name: 'CreatorMulti',
        component: CreatorMulti,
    },
    {
        path: '/CreatorInterface',
        name: 'CreatorInterface',
        component: CreatorInterface,
    },
    {
        path: '/FkazPlayer',
        name: 'FkazPlayer',
        component: FkazPlayer
    },
    {
        path: '/JawbPlayer',
        name: 'JawbPlayer',
        component: JawbPlayer
    },
    {
        path: '/JawwPlayer',
        name: 'JawwPlayer',
        component: JawwPlayer
    },
    {
        path: '/LybjPlayer',
        name: 'LybjPlayer',
        component: LybjPlayer
    },
    {
        path: '/DepositTool',
        name: 'DepositTool',
        component: DepositTool
    },
    {
        path: '/CPTool',
        name: 'CPTool',
        component: CPTool
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore();

    // 检查是否是页面刷新
    if (!userStore.isAuthenticated && userStore.getToken()) {
        try {
            // 尝试恢复用户会话
            await userStore.restoreSession();
        } catch (error) {
            console.error('恢复会话失败：', error);
            // 恢复失败则清除token
            userStore.clearToken()
        }
    }

    // 需要认证的路由
    if (to.meta.requiresAuth) {
        if (!userStore.isAuthenticated) {
            // 未登录，重定向到登录页
            next({ path: '/' });
        } else {
            // 已登录，允许访问
            next();
        }
    } else if (to.path === '/' && userStore.isAuthenticated) {
        // 已登录用户访问登录页，重定向到首页
        next('/HomePage');
    } else {
        // 其他情况正常放行
        next();
    }
})

export default router
