import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AccountModalProps {
  open: boolean
  onClose: () => void
  // Можете добавить обработчики для навигации к страницам login/register
  onLogin?: () => void
  onRegister?: () => void
}

export default function AccountModal({
  open,
  onClose,
  onLogin,
  onRegister,
}: AccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки аккаунта</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Имя пользователя</Label>
            <Input id="username" placeholder="Ваше имя" defaultValue="Пользователь" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="your@email.com" />
          </div>
          <div>
            <Label htmlFor="notifications">Уведомления</Label>
            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="email-notifications" defaultChecked />
              <label htmlFor="email-notifications" className="text-sm">
                Email уведомления
              </label>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input type="checkbox" id="push-notifications" />
              <label htmlFor="push-notifications" className="text-sm">
                Push уведомления
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={onLogin}>
              Войти
            </Button>
            <Button className="flex-1" onClick={onRegister} variant="outline">
              Зарегистрироваться
            </Button>
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
