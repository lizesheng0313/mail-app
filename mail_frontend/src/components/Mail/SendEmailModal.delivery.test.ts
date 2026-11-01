import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks=vi.hoisted(()=>({accounts:vi.fn(),invoke:vi.fn(),save:vi.fn(),message:vi.fn()}))
vi.mock('vue-i18n',()=>({useI18n:()=>({t:(key:string)=>key})}))
vi.mock('@/services/api',()=>({isTauri:()=>true}))
vi.mock('@/api/smtpAccounts',()=>({default:{getAccounts:mocks.accounts,saveSentEmails:mocks.save}}))
vi.mock('@/api/mailboxProxy',()=>({default:{previewRuntimeProxy:vi.fn().mockResolvedValue({code:0,data:{}})}}))
vi.mock('@tauri-apps/api/core',()=>({invoke:mocks.invoke}))
vi.mock('@/utils/message',()=>({showMessage:mocks.message}))
import SendEmailModal from './SendEmailModal.vue'

beforeEach(()=>{
  vi.clearAllMocks()
  mocks.accounts.mockResolvedValue({code:0,data:{accounts:[{
    id:9,email:'sender@example.test',status:'active',password:'fixture',smtp_host:'smtp.example.test',smtp_port:465
  }]}})
  mocks.save.mockResolvedValue({code:0})
})

it.each(['exception','explicit rejection'])('saves every recipient as failed for %s in simple compose',async(kind)=>{
  if(kind==='exception') mocks.invoke.mockRejectedValueOnce(new Error('535 Authentication failed'))
  else mocks.invoke.mockResolvedValueOnce({success:false,response_code:550,response_message:'550 User unknown'})
  const wrapper=mount(SendEmailModal,{props:{visible:true,presetMailboxId:7,
    mailboxes:[{id:7,email:'sender@example.test'}],replyTo:'first@example.test,second@example.test',replySubject:'Hello'},
    global:{stubs:{BaseModal:{template:'<div><slot/><button @click="$emit(\'confirm\')">send</button></div>'}}}})
  try{
    await flushPromises()
    await wrapper.get('textarea').setValue('Body')
    await wrapper.get('button').trigger('click')
    await vi.waitFor(()=>expect(mocks.save).toHaveBeenCalled())
    const records=mocks.save.mock.calls[0][0].records
    expect(records.map((r:any)=>r.to_email)).toEqual(['first@example.test','second@example.test'])
    expect(records.every((r:any)=>r.status==='failed' && r.error_message)).toBe(true)
    expect(wrapper.emitted('sent')).toBeUndefined()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Body')
  }finally{wrapper.unmount()}
})
