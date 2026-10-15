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
import MyPicturesPage from '@/pages/MyPicturesPage.vue'
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
      meta: {
        // 未登录点进来先跳登录页，登录后回跳原地址；不加这条要等到上传才被后端 40100 拦
        loginRequired: true,
      },
    },
    {
      path: '/picture/edit/:id',
      name: '编辑图片',
      component: AddPicturePage,
      meta: {
        // 同一个页面组件、同一个后端鉴权口径，跟着上面一起要登录
        loginRequired: true,
      },
    },
    {
      path: '/picture/:id',
      name: '图片详情',
      component: PictureDetailPage,
    },
    {
      path: '/space_analyze',
      name: '空间分析',
      // 唯一一处懒加载：分析页要拉 echarts，静态引入会把图表库算进首屏主包
      component: () => import('@/pages/SpaceAnalyzePage.vue'),
      meta: {
        // 六个分析端点全部要求登录态，未登录进来每个图表都会报错
        loginRequired: true,
      },
    },
    {
      path: '/my_pictures',
      name: '我的投稿',
      component: MyPicturesPage,
      meta: {
        // 仅普通用户可访问：管理员没有待审核内容，看自己的图走图片管理页
        userOnly: true,
      },
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
      meta: {
        // 后端私有空间分支要求「已登录 + 是空间归属人」，未登录进来只会拿到一串鉴权错误；
        // 不加 userOnly：管理员同样打不开别人的空间，而越权访问别人的空间 id 只能由后端拦
        loginRequired: true,
      },
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
