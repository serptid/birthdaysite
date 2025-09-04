import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MONTHS } from "@/constants/months"

interface BirthdayModalProps {
  open: boolean
  onClose: () => void
  selectedDay: { month: number; day: number } | null
}

export default function BirthdayModal({
  open,
  onClose,
  selectedDay,
}: BirthdayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Добавить день рождения
            {selectedDay && ` - ${selectedDay.day} ${MONTHS[selectedDay.month]}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input id="name" placeholder="Введите имя" />
          </div>
          <div>
            <Label className="pb-2" htmlFor="note">Заметка (необязательно)</Label>
            <Input id="note" placeholder="Подарок, возраст и т.д." />
          </div>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">Сохранить</Button>
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
