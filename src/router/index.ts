import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import UserLoginPage from '@/pages/user/UserLoginPage.vue'
import UserRegisterPage from '@/pages/user/UserRegisterPage.vue'
import UserCenterPage from '@/pages/user/UserCenterPage.vue'
import UserManagePage from '@/pages/admin/UserManagePage.vue'
import PictureManagePage from '@/pages/admin/PictureManagePage.vue'
import AddPictureBatchPage from '@/pages/admin/AddPictureBatchPage.vue'
import SpaceManagePage from '@/pages/admin/SpaceManagePage.vue'
import AddPicturePage from '@/pages/AddPicturePage.vue'
import PictureDetailPage from '@/pages/PictureDetailPage.vue'
import MySpacesPage from '@/pages/MySpacesPage.vue'
import SpaceDetailPage from '@/pages/SpaceDetailPage.vue'
import NoAuthPage from '@/pages/NoAuthPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/user/login',
      name: '用户登录',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: '用户注册',
      component: UserRegisterPage,
    },
    {
      path: '/user/center',
      name: '个人中心',
      component: UserCenterPage,
      meta: {
        // 需登录
        loginRequired: true,
      },
    },
    {
      path: '/add_picture',
      name: '创建图片',
      component: AddPicturePage,
    },
    {
      path: '/picture/edit/:id',
      name: '编辑图片',
      component: AddPicturePage,
    },
    {
      path: '/picture/:id',
      name: '图片详情',
      component: PictureDetailPage,
    },
    {
      path: '/my_spaces',
      name: '我的空间',
      component: MySpacesPage,
      meta: {
        // 仅普通用户可访问（管理员无个人空间，重定向到空间管理）
        userOnly: true,
      },
    },
    {
      path: '/space/:id',
      name: '空间详情',
      component: SpaceDetailPage,
    },
    {
      path: '/admin/userManage',
      name: '用户管理',
      component: UserManagePage,
      meta: {
        // 仅管理员可访问
        access: 'admin',
      },
    },
    {
      path: '/admin/pictureManage',
      name: '图片管理',
      component: PictureManagePage,
      meta: {
        // 仅管理员可访问
        access: 'admin',
      },
    },
    {
      path: '/admin/addPictureBatch',
      name: '批量创建图片',
      component: AddPictureBatchPage,
      meta: {
        // 仅管理员可访问
        access: 'admin',
      },
    },
    {
      path: '/admin/spaceManage',
      name: '空间管理',
      component: SpaceManagePage,
      meta: {
        // 仅管理员可访问
        access: 'admin',
      },
    },
    {
      path: '/noAuth',
      name: '无权限',
      component: NoAuthPage,
    },
    {
      path: '/:pathMatch(.*)*',
      name: '页面未找到',
      component: NoAuthPage,
    },
  ],
})

export default router
