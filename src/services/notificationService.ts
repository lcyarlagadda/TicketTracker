import emailjs from '@emailjs/browser';

// EmailJS configuration - you'll need to set these up in your EmailJS account
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'your_template_id';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface NotificationData {
  to_email: string;
  to_name: string;
  from_name: string;
  from_email: string;
  board_name: string;
  message: string;
  action_type: 'collaborator_added' | 'task_assigned' | 'mentioned' | 'task_updated';
  task_title?: string;
  task_url?: string;
  board_url?: string;
}

class NotificationService {
  private async sendEmail(templateId: string, templateParams: any): Promise<boolean> {
    try {
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        templateId,
        templateParams
      );
      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  notifyCollaboratorAdded(data: {
    collaboratorEmail: string;
    collaboratorName: string;
    boardName: string;
    addedBy: string;
    boardUrl: string;
  }): void {
    const templateParams = {
      to_email: data.collaboratorEmail,
      to_name: data.collaboratorName,
      from_name: data.addedBy,
      from_email: data.collaboratorEmail, // This will be the reply-to address
      board_name: data.boardName,
      action_type: 'collaborator_added',
      board_url: data.boardUrl,
      subject: `You've been added to board: ${data.boardName}`,
    };

    // Send email in background without blocking UI
    this.sendEmail('template_collaborator_ad', templateParams).catch(error => {
      console.error('Background email send failed:', error);
    });
  }

  notifyTaskAssigned(data: {
    assigneeEmail: string;
    assigneeName: string;
    taskTitle: string;
    boardName: string;
    assignedBy: string;
    taskId: string;
    taskUrl: string;
    boardUrl: string;
  }): void {
    const templateParams = {
      to_email: data.assigneeEmail,
      to_name: data.assigneeName,
      from_name: data.assignedBy,
      from_email: data.assigneeEmail, // This will be the reply-to address
      board_name: data.boardName,
      task_title: data.taskTitle,
      action_type: 'task_assigned',
      task_url: data.taskUrl,
      task_id: data.taskId,
      board_url: data.boardUrl,
      subject: `New task assigned: ${data.taskTitle}`,
    };

    console.log('templateParams', templateParams);

    // Send email in background without blocking UI
    this.sendEmail('template_task_assigned', templateParams).catch(error => {
      console.error('Background email send failed:', error);
    });
  }

  notifyMentioned(data: {
    mentionedEmail: string;
    mentionedName: string;
    mentionedBy: string;
    boardName: string;
    context: 'retrospective' | 'reflection';
    message: string;
    boardUrl: string;
  }): void {
    const templateParams = {
      to_email: data.mentionedEmail,
      to_name: data.mentionedName,
      from_name: data.mentionedBy,
      from_email: data.mentionedEmail, // This will be the reply-to address
      board_name: data.boardName,
      message: data.message,
      action_type: 'mentioned',
      context: data.context,
      board_url: data.boardUrl,
      subject: `You were mentioned in ${data.context} for board: ${data.boardName}`,
    };

    // Send email in background without blocking UI -- commented for now as there are no credits
    // this.sendEmail('template_mentioned', templateParams).catch(error => {
    //   console.error('Background email send failed:', error);
    // });
  }

  notifyTaskUpdated(data: {
    assigneeEmail: string;
    assigneeName: string;
    taskTitle: string;
    boardName: string;
    updatedBy: string;
    updateType: 'status' | 'priority' | 'description' | 'due_date';
    oldValue?: string;
    newValue?: string;
    taskUrl: string;
    boardUrl: string;
  }): void {
    const updateMessages = {
      status: `Status changed from "${data.oldValue}" to "${data.newValue}"`,
      priority: `Priority changed from "${data.oldValue}" to "${data.newValue}"`,
      description: 'Description was updated',
      due_date: `Due date changed from "${data.oldValue}" to "${data.newValue}"`,
    };

    const templateParams = {
      to_email: data.assigneeEmail,
      to_name: data.assigneeName,
      from_name: data.updatedBy,
      from_email: data.assigneeEmail, // This will be the reply-to address
      board_name: data.boardName,
      task_title: data.taskTitle,
      message: `The task "${data.taskTitle}" has been updated by ${data.updatedBy}. ${updateMessages[data.updateType]}.`,
      action_type: 'task_updated',
      update_type: data.updateType,
      task_url: data.taskUrl,
      board_url: data.boardUrl,
      subject: `Task updated: ${data.taskTitle}`,
    };

    // Send email in background without blocking UI  -- commented for now as there are no credits
    // this.sendEmail('template_task_updated', templateParams).catch(error => {
    //   console.error('Background email send failed:', error);
    // });
  }
}

export const notificationService = new NotificationService();
