<template>
  <component :is="iconComponent" :class="sizeClass" />
</template>

<script setup>
import { computed } from 'vue'
import {
  // 常用图标
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  XCircleIcon,
  NoSymbolIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  DocumentIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon,
  HomeIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  EllipsisHorizontalIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  CircleStackIcon,
  ChartBarIcon,
  ListBulletIcon,
  TableCellsIcon,
  CpuChipIcon,
  ServerIcon,
  CloudIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ShareIcon
  , ArrowUturnLeftIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'w-4 h-4'
  }
})

// 图标映射表
const iconMap = {
  // 基础操作
  'eye': EyeIcon,
  'edit': PencilSquareIcon,
  'delete': TrashIcon,
  'copy': ClipboardDocumentIcon,
  'check': CheckIcon,
  'check-circle': CheckCircleIcon,
  'x': XMarkIcon,
  'x-circle': XCircleIcon,
  'ban': NoSymbolIcon,
  
  // 媒体控制
  'play': PlayIcon,
  'pause': PauseIcon,
  'refresh': ArrowPathIcon,
  
  // 启用/禁用
  'enable': PlayCircleIcon,
  'disable': PauseCircleIcon,
  
  // 时间和设置
  'clock': ClockIcon,
  'settings': Cog6ToothIcon,
  
  // 上传下载
  'upload': ArrowUpTrayIcon,
  'download': ArrowDownTrayIcon,
  
  // 文件和文件夹
  'folder': FolderIcon,
  'document': DocumentIcon,
  'log': DocumentTextIcon,
  'database': CircleStackIcon,
  
  // 箭头和方向
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  
  // 加减
  'plus': PlusIcon,
  'minus': MinusIcon,
  
  // 搜索和通知
  'search': MagnifyingGlassIcon,
  'bell': BellIcon,
  
  // 用户和首页
  'user': UserIcon,
  'home': HomeIcon,
  
  // 信息和警告
  'info': InformationCircleIcon,
  'warning': ExclamationCircleIcon,
  'alert': ExclamationTriangleIcon,
  
  // 安全
  'shield': ShieldCheckIcon,
  'lock': LockClosedIcon,
  'unlock': LockOpenIcon,
  
  // 登录登出
  'login': ArrowRightOnRectangleIcon,
  'logout': ArrowLeftOnRectangleIcon,
  
  // 菜单
  'menu': Bars3Icon,
  'more': EllipsisHorizontalIcon,
  
  // 财务
  'dollar': CurrencyDollarIcon,
  'money': BanknotesIcon,
  
  // 数据和图表
  'chart': ChartBarIcon,
  'list': ListBulletIcon,
  'table': TableCellsIcon,
  
  // 技术
  'cpu': CpuChipIcon,
  'server': ServerIcon,
  'cloud': CloudIcon,
  
  // 分享
  'share': ShareIcon,

  // 退款/回退
  'refund': ArrowUturnLeftIcon
}

const iconComponent = computed(() => {
  return iconMap[props.name] || InformationCircleIcon
})

const sizeClass = computed(() => {
  const presetSizes = {
    'xs': 'w-3 h-3',
    'sm': 'w-4 h-4',
    'md': 'w-5 h-5',
    'lg': 'w-6 h-6',
    'xl': 'w-8 h-8',
    '2xl': 'w-10 h-10'
  }
  
  return presetSizes[props.size] || props.size
})
</script>
