import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import Customer from "../../../../domain/customer/entity/customer";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import { Transaction } from "sequelize";

export default class OrderRepository implements OrderRepositoryInterface {
  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }

  async update(entity: Order): Promise<void> {
    const sequelize = OrderModel.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance not found");
    }

    await sequelize.transaction(async (transaction: Transaction) => {
      await OrderModel.update(
        { total: entity.total() },
        { where: { id: entity.id }, transaction }
      );

      for (const item of entity.items) {
        await OrderItemModel.update(
          {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          },
          {
            where: { id: item.id, order_id: entity.id },
            transaction,
          }
        );
      }
    });
  }

  async find(id: string): Promise<Order> {
    let orderModel;
    try {
      orderModel = await OrderModel.findOne({
        where: { id },
        include: {
          model: OrderItemModel
        },
        rejectOnEmpty: true
      })
    } catch (error) {
      throw new Error("Order not found");
    }

    return new Order(
      orderModel.id,
      orderModel.customer_id,
      orderModel.items.map(orderItemModel => {
        return new OrderItem(
          orderItemModel.id,
          orderItemModel.name,
          orderItemModel.price,
          orderItemModel.product_id,
          orderItemModel.quantity
        )
      })
    );
  }

  async findAll(): Promise<Order[]> {
    const ordersModel = await OrderModel.findAll({
      include: {model: OrderItemModel }
    });

    return ordersModel.map(orderModel => {
      return new Order(
        orderModel.id,
        orderModel.customer_id,
        orderModel.items.map(orderItemModel => {
          return new OrderItem(
            orderItemModel.id,
            orderItemModel.name,
            orderItemModel.price,
            orderItemModel.product_id,
            orderItemModel.quantity
          )
        })
      );
    })
  }
}
