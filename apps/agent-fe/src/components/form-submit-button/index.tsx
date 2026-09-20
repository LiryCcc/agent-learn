import { useFormStatus } from 'react-dom';

type FormSubmitButtonProps = {
  children: string;
  className: string;
  name?: string;
  value?: string;
};

const FormSubmitButton = (props: FormSubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button className={props.className} disabled={pending} name={props.name} type='submit' value={props.value}>
      {props.children}
    </button>
  );
};

export default FormSubmitButton;
