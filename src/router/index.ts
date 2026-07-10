import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import CreatorMulti from '@/views/CreatorMulti.vue';
import CreatorInterface from '@/views/CreatorInterface.vue';
import FkazPlayer from '@/views/FkazPlayer.vue';
import JawbPlayer from '@/views/JawbPlayer.vue';
import JawwPlayer from '@/views/JawwPlayer.vue';
import LybjPlayer from '@/views/LybjPlayer.vue';
import GsssPlayer from '@/views/GsssPlayer.vue';
import DepositTool from '@/views/DepositTool.vue';
import CPTool from '@/views/CPTool.vue';
import JsonToExcelTool from '@/views/JsonToExcelTool.vue';
import ServiceDeploy from '@/views/ServiceDeploy.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'HomePage',
        component: HomePage
    },
    {
        path: '/HomePage',
        redirect: '/'
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
        path: '/GsssPlayer',
        name: 'GsssPlayer',
        component: GsssPlayer
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
    },
    {
        path: '/JsonToExcelTool',
        name: 'JsonToExcelTool',
        component: JsonToExcelTool
    },
    {
        path: '/ServiceDeploy',
        name: 'ServiceDeploy',
        component: ServiceDeploy
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
